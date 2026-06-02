import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  ScreenScaffold, Text, Skeleton, ErrorState, ScoreCard, ChoiceCard, QuestionCard, Button,
  Sheet, Countdown, Toast,
} from '../../../../lib/ui/components';
import type { SheetHandle } from '../../../../lib/ui/components/Sheet';
import { MapCanvas } from '../../../../lib/ui/components/MapCanvas';
import { TileDetailSheet } from '../../../../lib/ui/components/TileDetailSheet';
import { PresenceList, PresenceListEntry } from '../../../../lib/ui/components/PresenceList';
import { useScreenData } from '../../../../lib/ui/hooks/useScreenData';
import { mapError } from '../../../../lib/ui/error/mapError';
import { useSession } from '../../../../lib/ui/session/useSession';
import { getSupabaseClient } from '../../../../lib/supabase';
import { getActivityState } from '../../../../lib/territory/state';
import { attemptCapture, resolveChallenge } from '../../../../lib/territory/arbitrator';
import { computeTileRender } from '../../../../lib/territory-ui/tile-state';
import { formatRemainingMs, getTileTiming } from '../../../../lib/territory-ui/tile-timing';
import { getTileActionState } from '../../../../lib/territory-ui/tile-action';
import { isAdjacent } from '../../../../lib/territory/coords';
import { resolveChallengeSpec } from '../../../../lib/territory/challenge-spec';
import { TERRITORY_DEFAULTS } from '../../../../lib/territory/types';
import { leaveActivityPresence, listOnlineOpponents } from '../../../../lib/realtime-battle/presence';
import { sendBattleInvite } from '../../../../lib/realtime-battle/service';
import { buildChoiceOrder } from '../../../../lib/answering/choices';
import { AnsweringEngine } from '../../../../lib/answering/engine';
import type { Question } from '../../../../lib/answering/types';
import { makeTerritoryHostHooks } from '../../../../lib/answering/adapters/territory';
import { needsSampledDistractors, sampleDistractors } from '../../../../lib/answering/sample-distractors';
import { subscribeManagedRealtimeChannel } from '../../../../lib/supabase-realtime';
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
  const sb = useRef(getSupabaseClient()).current;
  const win = useWindowDimensions();

  const sheetRef = useRef<SheetHandle>(null);
  const authUserId = s.status === 'auth' ? s.user.id : null;

  const { state, refresh } = useScreenData(
    async (_signal: AbortSignal) => getActivityState(sb, activityId),
    [activityId],
    { pollMs: POLL_MAP_MS },
  );

  const [resolvedGroupId, setResolvedGroupId] = useState<string | null>(null);
  const [attackError, setAttackError] = useState<string | null>(null);
  const [attackPending, setAttackPending] = useState(false);
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
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const membersMap = useRef<Map<string, { display_name: string; group_color: string }>>(new Map());
  const mapId = state.status === 'ready' ? state.data.map_id : null;

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

  const syncPresence = useCallback(async (channel: RealtimeChannel | null = presenceChannelRef.current) => {
    if (!channel) return;
    if (!resolvedGroupId || s.status !== 'auth' || !authUserId) return;
    try {
      const { data: battles } = await sb
        .from('battles')
        .select('challenger_user_id, defender_user_id')
        .eq('activity_id', activityId)
        .in('status', ['pending_invite', 'in_progress']);

      const amIBusy = (battles ?? []).some(
        (b: any) => b.challenger_user_id === authUserId || b.defender_user_id === authUserId,
      );

      // Update our own presence state if it changed
      await channel.track({
        user_id: authUserId,
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
    } catch (error) {
      console.warn('[territory] failed to sync presence', error);
    }
  }, [activityId, resolvedGroupId, s.status, sb, authUserId]);

  // Presence channel — open while map is mounted and group is resolved
  useEffect(() => {
    if (!resolvedGroupId || s.status !== 'auth' || !authUserId) return;
    let active = true;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const unsubscribe = subscribeManagedRealtimeChannel(sb, {
      topic: `activity:${activityId}:presence`,
      options: {
        config: {
          presence: {
            key: authUserId,
          },
        },
      },
      setup: (channel) => {
        presenceChannelRef.current = channel as RealtimeChannel;
        return channel.on('presence', { event: 'sync' }, () => {
          void syncPresence();
        });
      },
      subscribe: (channel) => {
        channel.subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            if (!active) return;
            void syncPresence(channel as RealtimeChannel);
            heartbeatTimer = setInterval(() => {
              void syncPresence(channel as RealtimeChannel);
            }, 10_000);
          }
        });
      },
      cleanup: async (channel, client) => {
        await leaveActivityPresence(channel as RealtimeChannel);
        await client.removeChannel(channel as RealtimeChannel);
      },
      onError: (error) => {
        console.warn('[territory] presence channel setup failed', error);
      },
    });

    return () => {
      active = false;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      presenceChannelRef.current = null;
      unsubscribe();
    };
  }, [activityId, resolvedGroupId, s.status, sb, syncPresence, authUserId]);

  useEffect(() => {
    if (!resolvedGroupId || s.status !== 'auth') return;

    return subscribeManagedRealtimeChannel(sb, {
      topic: `battles-sync:${activityId}`,
      setup: (channel) =>
        channel.on(
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
        ),
      onError: (error) => {
        console.warn('[territory] battle sync setup failed', error);
      },
    });
  }, [activityId, resolvedGroupId, s.status, sb, syncPresence]);

  useEffect(() => {
    if (!mapId) return;

    return subscribeManagedRealtimeChannel(sb, {
      topic: `map-sync:${mapId}`,
      setup: (channel) =>
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hex_tiles',
            filter: `map_id=eq.${mapId}`,
          },
          () => {
            refresh();
          },
        ),
      onError: (error) => {
        console.warn('[territory] map sync setup failed', error);
      },
    });
  }, [mapId, refresh, sb]);

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

  useEffect(() => {
    if (activeTileId) {
      sheetRef.current?.open();
    }
  }, [activeTileId]);

  const tileSpec = useMemo(() => {
    if (!activeTile || !resolvedGroupId || activeTile.kind === 'special') return null;
    try {
      return resolveChallengeSpec(activeTile, resolvedGroupId, TERRITORY_DEFAULTS);
    } catch {
      return null;
    }
  }, [activeTile, resolvedGroupId]);

  const activeTileTiming = useMemo(() => {
    if (!activeTile) return null;
    return getTileTiming(activeTile, now);
  }, [activeTile, now]);

  const activeTileStatusLabel = useMemo(() => {
    if (!activeTileTiming?.status) return null;
    return activeTileTiming.status === 'locked' ? '挑戰鎖定中' : '冷卻中';
  }, [activeTileTiming]);

  const activeTileStatusCountdown = useMemo(() => {
    if (!activeTileTiming?.status) return null;
    return formatRemainingMs(activeTileTiming.remainingMs);
  }, [activeTileTiming]);

  const attackable = useMemo(() => {
    if (!tileSpec || !activeTile || !resolvedGroupId || state.status !== 'ready' || isEnded) return false;
    // Adjacency check: must own the tile itself (self-recapture) OR an adjacent tile
    const isSelfOwned = activeTile.owner_group_id === resolvedGroupId;
    const hasAdjacentOwned = state.data.tiles.some(
      (t) => t.owner_group_id === resolvedGroupId && isAdjacent(t, activeTile)
    );
    return isSelfOwned || hasAdjacentOwned;
  }, [tileSpec, activeTile, resolvedGroupId, state, isEnded]);

  const tileRender = useMemo(() => {
    if (!activeTile) return null;
    return computeTileRender(activeTile, { myGroupId: resolvedGroupId, now });
  }, [activeTile, resolvedGroupId, now]);

  const myTreasury = state.status === 'ready'
    ? state.data.groups.find((g) => g.id === resolvedGroupId)?.treasury
    : undefined;

  const tileActionState = useMemo(() => getTileActionState({
    isEnded,
    isCooldown: tileRender?.isCooldown ?? false,
    hasActiveChallenge: tileRender?.hasActiveChallenge ?? false,
    attackableByAdjacency: attackable,
    treasury: myTreasury,
    cost: tileSpec?.cost,
  }), [attackable, isEnded, myTreasury, tileRender?.hasActiveChallenge, tileRender?.isCooldown, tileSpec?.cost]);

  const tileWarningMessage = useMemo(() => {
    if (attackPending) {
      return '正在建立挑戰...';
    }
    if (tileActionState.disabledReason === 'insufficient_treasury') {
      return '國庫財政點數不足';
    }
    return null;
  }, [attackPending, tileActionState.disabledReason]);

  const handleTilePress = useCallback((tileId: string) => {
    if (activeTileId === tileId) {
      sheetRef.current?.open();
      return;
    }
    setActiveTileId(tileId);
  }, [activeTileId]);

  if (state.status === 'loading') return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  if (state.status === 'error') return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  if (state.status === 'empty') return <ScreenScaffold><Text>找不到活動</Text></ScreenScaffold>;

  const data = state.data;
  const myGroup = data.groups.find((g) => g.id === resolvedGroupId);

  async function onAttack() {
    if (!activeTile || isEnded || !tileActionState.canAttack || attackPending) return;
    setAttackPending(true);
    setAttackError(null);
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
        onAttempt: (a) => {
          if (!resolvedGroupId || s.status !== 'auth') return;
          sb.from('attempts')
            .insert({
              user_id: s.user.id,
              activity_id: activityId,
              question_id: a.question_id,
              tile_id: activeTile.id,
              context: 'territory',
              is_correct: a.is_correct,
              response_ms: a.response_ms,
            })
            .then(({ error }) => {
              if (error) console.warn('[territory] failed to record attempt', error);
            });
        },
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
      setAttackError(mapError(e).message);
      refresh();
    } finally {
      setAttackPending(false);
    }
  }

  const myTileCount = data.tiles.filter((t) => t.owner_group_id === resolvedGroupId).length;

  return (
    <ScreenScaffold>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[3] }}>
        <Button title="←" variant="ghost" onPress={() => router.replace('/(app)/territory' as any)} />
        <ScoreCard label="國庫" value={myGroup?.treasury ?? 0} />
        <ScoreCard label="領地" value={myTileCount} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text variant="caption" color={isEnded ? 'warm' : 'muted'}>
            {isEnded ? '活動已結束' : '剩餘時間'}
          </Text>
          <Countdown deadline={effectiveEndAt?.toISOString() ?? null} />
        </View>
        <Button title="排行榜" variant="ghost" onPress={() => router.push(`/(app)/territory/${activityId}/leaderboard` as any)} />
      </View>

      {/* Map */}
      <MapCanvas
        tiles={data.tiles}
        groups={data.groups}
        myGroupId={resolvedGroupId}
        now={now}
        width={win.width - space[4] * 2}
        height={win.height * 0.6}
        onTilePress={handleTilePress}
      />

      {/* Tile detail sheet */}
      {activeTile ? (
        <Sheet ref={sheetRef} onClose={() => setActiveTileId(null)} snapPoints={['40%']}>
          {activeTile.kind === 'special' ? (
	            <PresenceList
	              entries={presenceList}
	              onChallenge={async (defenderId) => {
	                if (isEnded || attackPending) return;
	                setAttackPending(true);
	                setAttackError(null);
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
	                  setAttackError(mapError(e).message);
	                  refresh();
	                } finally {
	                  setAttackPending(false);
	                }
	              }}
	            />
          ) : (
            <TileDetailSheet
              render={tileRender ?? computeTileRender(activeTile, { myGroupId: resolvedGroupId, now })}
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
	              statusLabel={activeTileStatusLabel}
	              statusCountdown={activeTileStatusCountdown}
	              warningMessage={tileWarningMessage}
	              attackable={tileActionState.canAttack && !attackPending}
	              onAttack={onAttack}
	              specialDisabled={isEnded}
	            />
          )}
        </Sheet>
      ) : null}

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
	          <Button title="放棄" variant="ghost" onPress={() => { void engine.abort(); setAnswering(false); }} />
	        </View>
	      ) : null}
	      <Toast
	        visible={!!attackError}
	        message={attackError ?? ''}
	        variant="warm"
	        onHide={() => setAttackError(null)}
	      />
	    </ScreenScaffold>
	  );
	}
