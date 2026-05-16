// app/(app)/home/index.tsx
import React from 'react';
import { View } from 'react-native';
import { ScreenScaffold, Text, Skeleton, ErrorState } from '../../../lib/ui/components';
import { TodayTaskCard, RoadmapProgressCard, BattleStatusPlaceholderCard } from '../../../lib/ui/composites/HomeCards';
import { useSession } from '../../../lib/ui/session/useSession';
import { useScreenData } from '../../../lib/ui/hooks/useScreenData';
import { getSupabaseClient } from '../../../lib/supabase';
import { getRoadmapBank, getProgress } from '../../../lib/roadmap/service';
import { space } from '../../../lib/ui/tokens';

export default function Home() {
  const s = useSession();
  const sb = getSupabaseClient();

  const { state, refresh } = useScreenData(async () => {
    if (s.status !== 'auth') return null;
    const bank = getRoadmapBank();
    const progress = await getProgress(sb, s.user.id);
    const config = bank.config;
    const cur = progress?.current_stage ?? 1;
    const level = config.levels.find((l) => cur >= l.stage_start && cur <= l.stage_end);
    const levelLabel = level ? `Level ${level.level} (Stage ${level.stage_start}-${level.stage_end})` : `Stage ${cur}`;
    const levelProgress = level ? (cur - level.stage_start) / Math.max(1, (level.stage_end - level.stage_start + 1)) : 0;
    return { stageLabel: `Roadmap Stage ${cur}`, levelLabel, levelProgress };
  }, [s.status === 'auth' ? s.user.id : null]);

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
            <BattleStatusPlaceholderCard />
            <RoadmapProgressCard levelLabel={state.status === 'ready' ? state.data.levelLabel : ''} progress={state.status === 'ready' ? state.data.levelProgress : 0} />
          </>
        )}
      </View>
    </ScreenScaffold>
  );
}
