import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ScreenScaffold, Text, Skeleton, ErrorState, ScoreCard, ChoiceCard, QuestionCard, Button,
  Sheet, Countdown,
} from '../../../../lib/ui/components';
import type { SheetHandle } from '../../../../lib/ui/components/Sheet';
import { MapCanvas } from '../../../../lib/ui/components/MapCanvas';
import { TileDetailSheet } from '../../../../lib/ui/components/TileDetailSheet';
import { PresenceList, PresenceListEntry } from '../../../../lib/ui/components/PresenceList';
import { useScreenData } from '../../../../lib/ui/hooks/useScreenData';
import { useSession } from '../../../../lib/ui/session/useSession';
import { getSupabaseClient } from '../../../../lib/supabase';
import { getActivityState } from '../../../../lib/territory/state';
import { attemptCapture, resolveChallenge } from '../../../../lib/territory/arbitrator';
import { computeTileRender } from '../../../../lib/territory-ui/tile-state';
import { isAdjacent } from '../../../../lib/territory/coords';
import { resolveChallengeSpec } from '../../../../lib/territory/challenge-spec';
import { TERRITORY_DEFAULTS } from '../../../../lib/territory/types';
import { joinActivityPresence, leaveActivityPresence, listOnlineOpponents } from '../../../../lib/realtime-battle/presence';
import { sendBattleInvite } from '../../../../lib/realtime-battle/service';
import { buildChoiceOrder } from '../../../../lib/answering/choices';
import { AnsweringEngine } from '../../../../lib/answering/engine';
import type { Question } from '../../../../lib/answering/types';
import { makeTerritoryHostHooks } from '../../../../lib/answering/adapters/territory';
import { needsSampledDistractors, sampleDistractors } from '../../../../lib/answering/sample-distractors';
import { space, color } from '../../../../lib/ui/tokens';

const POLL_MAP_MS = 10_000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MapScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const s = useSession();
  const sb = getSupabaseClient();
  const win = useWindowDimensions();

  const sheetRef = useRef<SheetHandle>(null);

  const { state, refresh } = useScreenData(
    async (_signal: AbortSignal) => getActivityState(sb, activityId),
    [activityId],
    { pollMs: POLL_MAP_MS },
  );

  const [resolvedGroupId, setResolvedGroupId] = useState<string | null>(null);
  useEffect(() => {
    if (s.status !== 'auth' || state.status !== 'ready') return;
    (async () => {
      const { data } = await sb
        .from('group_members')
        .select('group_id, groups!inner(activity_id)')
        .eq('user_id', s.user.id)
        .eq('groups.activity_id', activityId)
        .maybeSingle();
      setResolvedGroupId((data as any)?.group_id ?? null);
    })();
  }, [s.status, state.status, activityId]);

  const [activeTileId, setActiveTileId] = useState<string | null>(null);

  // Presence state for special tiles
  const [presenceList, setPresenceList] = useState<PresenceListEntry[]>([]);
  const membersMap = useRef<Map<string, { display_name: string; group_color: string }>>(new Map());

  // Fetch all members once when activity + group are known
  useEffect(() => {
    if (state.status !== 'ready' || !resolvedGroupId) return;
    (async () => {
      const { data: mems } = await sb
        .from('group_members')
        .select('user_id, group_id, groups!inner(color, activity_id), users!inner(display_name)')
        .eq('groups.activity_id', activityId);
      const map = new Map<string, { display_name: string; group_color: string }>();
      (mems ?? []).forEach((m: any) => {
        map.set(m.user_id, {
          display_name: m.users?.display_name ?? m.user_id.slice(0, 8),
          group_color: m.groups?.color ?? color.brand.primaryMuted,
        });
      });
      membersMap.current = map;
    })();
  }, [state.status, activityId, resolvedGroupId, sb]);

  // Presence channel — open while map is mounted and group is resolved
  useEffect(() => {
    if (!resolvedGroupId || s.status !== 'auth') return;
    const entry = { user_id: s.user.id, group_id: resolvedGroupId, in_battle: false };
    const channel = joinActivityPresence(activityId, entry, sb);
    const syncPresence = async () => {
      const { data: battles } = await sb
        .from('battles')
        .select('challenger_user_id, defender_user_id')
        .eq('activity_id', activityId)
        .in('status', ['pending_invite', 'in_progress']);

      const amIBusy = (battles ?? []).some(
        (b: any) => b.challenger_user_id === s.user.id || b.defender_user_id === s.user.id,
      );

      // Update our own presence state if it changed
      void channel.track({
        user_id: s.user.id,
        group_id: resolvedGroupId,
        in_battle: amIBusy,
        last_active_at: new Date().toISOString(),
      });

      const busyUsers = new Set<string>();
      (battles ?? []).forEach((battle: any) => {
        if (battle.challenger_user_id) busyUsers.add(battle.challenger_user_id);
        if (battle.defender_user_id) busyUsers.add(battle.defender_user_id);
      });
      const opponents = listOnlineOpponents(channel, resolvedGroupId)
        .filter((op) => !busyUsers.has(op.user_id));
      const enriched = opponents.map((op) => ({
        user_id: op.user_id,
        display_name: membersMap.current.get(op.user_id)?.display_name ?? op.user_id.slice(0, 8),
        group_id: op.group_id,
        group_color: membersMap.current.get(op.user_id)?.group_color ?? color.brand.primaryMuted,
        in_battle: op.in_battle,
      }));
      setPresenceList(enriched);
    };

    channel.on('presence', { event: 'sync' }, () => {
      void syncPresence();
    });

    // Reactive battle-busy filtering: refresh list when any battle in this activity changes
    const battleChannel = sb
      .channel(`battles-sync:${activityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battles',
          filter: `activity_id=eq.${activityId}`,
        },
        () => {
          void syncPresence();
        },
      );

    // Subscribe to both after setting up listeners
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        void syncPresence();
      }
    });
    battleChannel.subscribe();

    return () => {
      leaveActivityPresence(channel);
      sb.removeChannel(battleChannel);
    };
  }, [resolvedGroupId, s.status, activityId, sb]);

  const engine = useMemo(() => new AnsweringEngine(), []);
  const [answering, setAnswering] = useState<boolean>(false);
  const [, force] = useState(0);
  useEffect(() => engine.subscribe(() => force((x) => x + 1)), [engine]);

  const answeringState = engine.state;
  const answeringChoices = useMemo(() => {
    if (!answeringState.current) return [];
    return buildChoiceOrder(answeringState.current);
  }, [answeringState.current?.id]);

  const effectiveEndAt = useMemo(() => {
    if (state.status !== 'ready') return null;
    const endsAt = new Date(state.data.ends_at);
    if (!state.data.sudden_death_started_at) return endsAt;
    const sdEnd = new Date(new Date(state.data.sudden_death_started_at).getTime() + 12 * 3600000);
    return endsAt < sdEnd ? endsAt : sdEnd;
  }, [state]);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isEnded = state.status === 'ready' && (
    state.data.status === 'ended' || (effectiveEndAt ? now >= effectiveEndAt : false)
  );

  const activeTile = useMemo(() => {
    if (state.status !== 'ready') return null;
    return activeTileId ? state.data.tiles.find((t) => t.id === activeTileId) ?? null : null;
  }, [activeTileId, state]);

  const tileSpec = useMemo(() => {
    if (!activeTile || !resolvedGroupId || activeTile.kind === 'special') return null;
    try {
      return resolveChallengeSpec(activeTile, resolvedGroupId, TERRITORY_DEFAULTS);
    } catch {
      return null;
    }
  }, [activeTile, resolvedGroupId]);

  const attackable = useMemo(() => {
    if (!tileSpec || !activeTile || !resolvedGroupId || state.status !== 'ready' || isEnded) return false;
    // Adjacency check: must own the tile itself (self-recapture) OR an adjacent tile
    const isSelfOwned = activeTile.owner_group_id === resolvedGroupId;
    const hasAdjacentOwned = state.data.tiles.some(
      (t) => t.owner_group_id === resolvedGroupId && isAdjacent(t, activeTile)
    );
    return isSelfOwned || hasAdjacentOwned;
  }, [tileSpec, activeTile, resolvedGroupId, state, isEnded]);

  if (state.status === 'loading') return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  if (state.status === 'error') return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  if (state.status === 'empty') return <ScreenScaffold><Text>找不到活動</Text></ScreenScaffold>;

  const data = state.data;
  const myGroup = data.groups.find((g) => g.id === resolvedGroupId);

  async function onAttack() {
    if (!activeTile || isEnded) return;
    try {
      const { challenge_id, spec } = await attemptCapture(sb, {
        activity_id: activityId,
        tile_id: activeTile.id,
      });

      const { data: act } = await sb
        .from('activities')
        .select('question_bank_id')
        .eq('id', activityId)
        .single();
      const bankId = (act as any)?.question_bank_id;
      if (!bankId) throw new Error('activity has no question_bank_id');

      // Fetch the whole bank (no difficulty filter at the query level):
      // custom banks store difficulty='standard' for every row, so an
      // 'advanced' challenge spec would otherwise match zero questions.
      const { data: pool } = await sb
        .from('questions')
        .select('id, prompt, correct_answer, distractors, meta')
        .eq('bank_id', bankId);

      const fullPool = (pool ?? []) as Question[];
      // Prefer the difficulty-matched subset (official banks rely on it);
      // fall back to the full pool when it can't satisfy the count.
      const byDifficulty = fullPool.filter(
        (q) => (q.meta as { difficulty?: string } | undefined)?.difficulty === spec.difficulty,
      );
      const sourcePool =
        byDifficulty.length >= spec.question_count ? byDifficulty : fullPool;
      const answerPool = fullPool.map((q) => q.correct_answer);

      if (sourcePool.length < spec.question_count) {
        await resolveChallenge(sb, {
          activity_id: activityId,
          challenge_id,
          tile_id: activeTile.id,
          kind: spec.kind,
          all_correct: false,
          spec,
        });
        throw new Error(
          `題庫題數不足（需要 ${spec.question_count} 題，僅有 ${sourcePool.length} 題）`,
        );
      }

      const picked = shuffle(sourcePool).slice(0, spec.question_count);
      const base: Question[] = picked;

      // Custom-bank questions carry placeholder distractors + a 詞性 in
      // meta — sample real distractors and compose the prompt as 中文（詞性）.
      const questions: Question[] = base.map((q) => {
        const pos = (q.meta as { part_of_speech?: string } | undefined)?.part_of_speech;
        return {
          ...q,
          prompt: pos ? `${q.prompt}（${pos}）` : q.prompt,
          distractors: needsSampledDistractors(q.distractors)
            ? sampleDistractors(answerPool, q.correct_answer)
            : q.distractors,
        };
      });

      sheetRef.current?.close();
      setAnswering(true);

      const hooks = makeTerritoryHostHooks({
        resolveChallenge: ({ all_correct }) =>
          resolveChallenge(sb, {
            activity_id: activityId,
            challenge_id,
            tile_id: activeTile.id,
            kind: spec.kind,
            all_correct,
            spec,
          }),
        onResolved: (_allCorrect: boolean) => {
          setAnswering(false);
          refresh();
        },
      });
      engine.start({ questions, ...hooks });
    } catch (e) {
      console.warn('attempt capture failed', e);
    }
  }

  const myTileCount = data.tiles.filter((t) => t.owner_group_id === resolvedGroupId).length;

  return (
    <ScreenScaffold>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[3] }}>
        <Button title="←" variant="ghost" onPress={() => router.back()} />
        <ScoreCard label="國庫" value={myGroup?.treasury ?? 0} />
        <ScoreCard label="領地" value={myTileCount} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text variant="caption" color={isEnded ? color.brand.error : 'muted'}>
            {isEnded ? '活動已結束' : '剩餘時間'}
          </Text>
          <Countdown deadline={effectiveEndAt} />
        </View>
        <Button title="排行榜" variant="ghost" onPress={() => router.push(`/(app)/territory/${activityId}/leaderboard` as any)} />
      </View>

      {/* Map */}
      <MapCanvas
        tiles={data.tiles}
        groups={data.groups}
        myGroupId={resolvedGroupId}
        width={win.width - space[4] * 2}
        height={win.height * 0.6}
        onTilePress={(tileId) => {
          setActiveTileId(tileId);
          sheetRef.current?.open();
        }}
      />

      {/* Tile detail sheet */}
      <Sheet ref={sheetRef} onClose={() => setActiveTileId(null)} snapPoints={['40%']}>
        {activeTile ? (
          activeTile.kind === 'special' ? (
            <PresenceList
              entries={presenceList}
              onChallenge={async (defenderId) => {
                if (isEnded) return;
                try {
                  const battleId = await sendBattleInvite(sb, {
                    activity_id: activityId,
                    tile_id: activeTile.id,
                    defender_user_id: defenderId,
                  });
                  sheetRef.current?.close();
                  router.push(`/battle/${battleId}` as any);
                } catch (e) {
                  console.warn('sendBattleInvite failed', e);
                }
              }}
            />
          ) : (
            <TileDetailSheet
              render={computeTileRender(activeTile, { myGroupId: resolvedGroupId, now })}
              ownerName={
                activeTile.owner_group_id
                  ? data.groups.find((g) => g.id === activeTile.owner_group_id)?.name
                  : undefined
              }
              ownerColor={
                activeTile.owner_group_id
                  ? data.groups.find((g) => g.id === activeTile.owner_group_id)?.color
                  : undefined
              }
              costLabel={tileSpec ? tileSpec.cost.toString() : '—'}
              rewardLabel={tileSpec ? tileSpec.success_reward.toString() : '—'}
              attackable={attackable}
              onAttack={onAttack}
              specialDisabled={isEnded}
            />
          )
        ) : null}
      </Sheet>

      {/* Answering overlay */}
      {answering ? (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(245,239,224,0.97)', padding: space[4],
        }}>
          {answeringState.current ? (
            <>
              <QuestionCard prompt={answeringState.current.prompt} />
              {answeringChoices.map((c, i) => (
                <ChoiceCard
                  key={c}
                  pick={('ABCD'[i] as 'A' | 'B' | 'C' | 'D')}
                  choice={c}
                  state={
                    answeringState.phase === 'reveal'
                      ? c === answeringState.current!.correct_answer
                        ? 'correct'
                        : c === answeringState.lastAttempt?.chosen
                        ? 'incorrect'
                        : 'idle'
                      : 'idle'
                  }
                  onPress={() => engine.answer(c)}
                />
              ))}
              {answeringState.phase === 'reveal' ? (
                <Button title="下一題 →" onPress={() => engine.next()} />
              ) : null}
            </>
          ) : null}
          <Button title="放棄" variant="ghost" onPress={() => { engine.abort(); setAnswering(false); }} />
        </View>
      ) : null}
    </ScreenScaffold>
  );
}
