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
import { joinActivityPresence, leaveActivityPresence, listOnlineOpponents } from '../../../../lib/realtime-battle/presence';
import { sendBattleInvite } from '../../../../lib/realtime-battle/service';
import { AnsweringEngine } from '../../../../lib/answering/engine';
import type { Question } from '../../../../lib/answering/types';
import { makeTerritoryHostHooks } from '../../../../lib/answering/adapters/territory';
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
    const syncPresence = () => {
      const opponents = listOnlineOpponents(channel, resolvedGroupId);
      const enriched = opponents.map((op) => ({
        user_id: op.user_id,
        display_name: membersMap.current.get(op.user_id)?.display_name ?? op.user_id.slice(0, 8),
        group_id: op.group_id,
        group_color: membersMap.current.get(op.user_id)?.group_color ?? color.brand.primaryMuted,
        in_battle: op.in_battle,
      }));
      setPresenceList(enriched);
    };
    channel.on('presence', { event: 'sync' }, syncPresence);
    return () => { leaveActivityPresence(channel); };
  }, [resolvedGroupId, s.status, activityId, sb]);

  const engine = useMemo(() => new AnsweringEngine(), []);
  const [answering, setAnswering] = useState<boolean>(false);
  const [, force] = useState(0);
  useEffect(() => engine.subscribe(() => force((x) => x + 1)), [engine]);

  if (state.status === 'loading') return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  if (state.status === 'error') return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  if (state.status === 'empty') return <ScreenScaffold><Text>找不到活動</Text></ScreenScaffold>;

  const data = state.data;
  const myGroup = data.groups.find((g) => g.id === resolvedGroupId);
  const activeTile = activeTileId ? data.tiles.find((t) => t.id === activeTileId) ?? null : null;

  async function onAttack() {
    if (!activeTile) return;
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

      const { data: pool } = await sb
        .from('questions')
        .select('id, prompt, correct_answer, distractors, meta')
        .eq('bank_id', bankId)
        .filter('meta->>difficulty', 'eq', spec.difficulty);

      const allPool = (pool ?? []) as Question[];
      const picked = shuffle(allPool).slice(0, spec.question_count);
      const questions: Question[] = picked.length >= spec.question_count
        ? picked
        : allPool.slice(0, spec.question_count);

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

  const answeringState = engine.state;

  return (
    <ScreenScaffold>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[3] }}>
        <Button title="←" variant="ghost" onPress={() => router.back()} />
        <ScoreCard label="國庫" value={myGroup?.treasury ?? 0} />
        <ScoreCard label="領地" value={myTileCount} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text variant="caption" color="muted">倒數</Text>
          <Countdown deadline={data.next_refresh_at} />
        </View>
        <Button title="榜" variant="ghost" onPress={() => router.push(`/(app)/territory/${activityId}/leaderboard` as any)} />
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
              render={computeTileRender(activeTile, { myGroupId: resolvedGroupId, now: new Date() })}
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
              costLabel="—"
              rewardLabel="—"
              attackable={!!resolvedGroupId}
              onAttack={onAttack}
              specialDisabled={false}
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
              {[answeringState.current.correct_answer, ...answeringState.current.distractors].map((c, i) => (
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
