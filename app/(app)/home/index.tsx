// app/(app)/home/index.tsx
import React, { useRef, useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ScreenScaffold, Text, Skeleton, ErrorState } from '../../../lib/ui/components';
import {
  TodayTaskCard, RoadmapProgressCard, BattleStatusCard, BattleStatusPlaceholderCard,
} from '../../../lib/ui/composites/HomeCards';
import { useSession } from '../../../lib/ui/session/useSession';
import { useScreenData } from '../../../lib/ui/hooks/useScreenData';
import { getSupabaseClient } from '../../../lib/supabase';
import { getRoadmapBank, getProgress } from '../../../lib/roadmap/service';
import { getActivityState } from '../../../lib/territory/state';
import { space } from '../../../lib/ui/tokens';

interface BattleStatus {
  activityName: string;
  myScore: number;
  secondScore: number;
}

async function fetchBattleStatus(
  sb: ReturnType<typeof getSupabaseClient>,
  userId: string,
): Promise<BattleStatus | null> {
  // Find user's group in an active activity
  const { data: mem } = await sb
    .from('group_members')
    .select('group_id, groups!inner(id, color, activity_id, activities!inner(id, name, status))')
    .eq('user_id', userId)
    .eq('groups.activities.status', 'active')
    .limit(1)
    .maybeSingle();
  if (!mem) return null;

  const g = (mem as any).groups;
  const act = g?.activities;
  if (!act) return null;

  const aState = await getActivityState(sb, act.id);
  const sorted = [...aState.groups].sort((a, b) => b.treasury - a.treasury);
  const myGroup = sorted.find((gr) => gr.id === g.id);
  const myScore = myGroup?.treasury ?? 0;
  const second = sorted.find((gr) => gr.id !== g.id)?.treasury ?? 0;
  return { activityName: act.name, myScore, secondScore: second };
}

export default function Home() {
  const s = useSession();
  const sb = getSupabaseClient();

  const { state, refresh } = useScreenData(async () => {
    if (s.status !== 'auth') return null;
    const [bank, progress, battle] = await Promise.all([
      Promise.resolve(getRoadmapBank()),
      getProgress(sb, s.user.id),
      fetchBattleStatus(sb, s.user.id),
    ]);
    const config = bank.config;
    const cur = progress?.current_stage ?? 1;
    const level = config.levels.find((l) => cur >= l.stage_start && cur <= l.stage_end);
    const levelLabel = level ? `Level ${level.level} (Stage ${level.stage_start}-${level.stage_end})` : `Stage ${cur}`;
    const levelProgress = level ? (cur - level.stage_start) / Math.max(1, (level.stage_end - level.stage_start + 1)) : 0;
    return { stageLabel: `Roadmap Stage ${cur}`, levelLabel, levelProgress, battle };
  }, [s.status === 'auth' ? s.user.id : null], { pollMs: 15_000 });

  // Re-fetch on focus so home progress card reflects the latest DB state.
  const mounted = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!mounted.current) { mounted.current = true; return; }
    refresh();
  }, [refresh]));

  if (s.status !== 'auth') return null;
  const name = s.user.display_name ?? s.user.email;

  return (
    <ScreenScaffold scroll>
      <Text variant="h1">早安，{name}</Text>
      <View style={{ gap: space[3] }}>
        {state.status === 'loading' ? <Skeleton height={120} /> :
         state.status === 'error' ? <ErrorState error={state.error} onRetry={refresh} /> : (
          <>
            <TodayTaskCard stageLabel={state.status === 'ready' ? state.data.stageLabel : ''} doneToday={0} totalToday={1} />
            {state.status === 'ready' && state.data.battle ? (
              <BattleStatusCard
                activityName={state.data.battle.activityName}
                myScore={state.data.battle.myScore}
                secondScore={state.data.battle.secondScore}
              />
            ) : (
              <BattleStatusPlaceholderCard />
            )}
            <RoadmapProgressCard levelLabel={state.status === 'ready' ? state.data.levelLabel : ''} progress={state.status === 'ready' ? state.data.levelProgress : 0} />
          </>
        )}
      </View>
    </ScreenScaffold>
  );
}
