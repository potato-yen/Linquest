// app/(app)/roadmap/index.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScreenScaffold, Text, Skeleton, ErrorState, Button } from '../../../lib/ui/components';
import { RoadmapTrail } from '../../../lib/ui/components/RoadmapTrail';
import { useScreenData } from '../../../lib/ui/hooks/useScreenData';
import { useSession } from '../../../lib/ui/session/useSession';
import { getSupabaseClient } from '../../../lib/supabase';
import { getRoadmapBank, getProgress } from '../../../lib/roadmap/service';
import { deriveRoadmapProgressState } from '../../../lib/roadmap/progress';
import { stagePosition } from '../../../lib/ui/trail/trail-layout';
import { space } from '../../../lib/ui/tokens';

export default function RoadmapScreen() {
  const s = useSession();
  const sb = getSupabaseClient();
  const win = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);

  // result.tsx routes back here with ?unlocked=<stage> after a stage clears;
  // capture it once so the trail plays the unlock burst, then strip the
  // param so a later refocus/remount doesn't replay it.
  const params = useLocalSearchParams<{ unlocked?: string }>();
  const justUnlockedRef = useRef<number | undefined>(undefined);
  if (params.unlocked && justUnlockedRef.current === undefined) {
    justUnlockedRef.current = Number(params.unlocked);
  }
  useEffect(() => {
    if (params.unlocked) router.setParams({ unlocked: undefined });
  }, [params.unlocked]);

  const { state, refresh } = useScreenData(async () => {
    if (s.status !== 'auth') return null;
    const bank = getRoadmapBank();
    const progress = await getProgress(sb, s.user.id);
    const lastStage = bank.config.levels.reduce((m, l) => Math.max(m, l.stage_end), 1);
    return { bankId: bank.id, currentStage: progress?.current_stage ?? 1, lastStage };
  }, [s.status === 'auth' ? s.user.id : null]);

  // Re-fetch whenever the tab comes back into focus so progress reflects DB truth.
  const mounted = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!mounted.current) { mounted.current = true; return; } // skip first focus (useScreenData already loads)
    refresh();
  }, [refresh]));

  // Scroll to the current stage once data is available.
  useEffect(() => {
    if (state.status !== 'ready') return;
    const { currentStage, lastStage } = state.data;
    const progressState = deriveRoadmapProgressState(currentStage, lastStage);
    const h = Math.max(win.height * 1.4, lastStage * 80);
    const pos = stagePosition({
      stage: progressState.playableStage,
      lastStage,
      viewport: { width: win.width - space[4] * 2, height: h },
    });
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, pos.y - win.height / 2), animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [state.status, win.width, win.height]);

  if (state.status === 'loading') return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  if (state.status === 'error')   return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  if (state.status === 'empty')   return <ScreenScaffold><Text>找不到題庫</Text></ScreenScaffold>;

  const { currentStage, lastStage } = state.data;
  const progressState = deriveRoadmapProgressState(currentStage, lastStage);
  const trailHeight = Math.max(win.height * 1.4, lastStage * 80);

  return (
    <ScreenScaffold>
      <Text variant="h1">關卡進度</Text>
      <Text color="muted">
        {progressState.isComplete
          ? `已完成全部 ${lastStage} 關`
          : `目前在第 ${currentStage} 關，共 ${lastStage} 關`}
      </Text>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: space[7] }}>
        <RoadmapTrail
          lastStage={lastStage}
          currentStage={progressState.playableStage}
          width={win.width - space[4] * 2}
          height={trailHeight}
          justUnlockedStage={justUnlockedRef.current}
          onPressStage={(stg) => {
            if (stg <= progressState.playableStage) router.push(`/(app)/roadmap/stage/${stg}`);
          }}
        />
      </ScrollView>
      <Button
        title={progressState.isComplete ? '全部完成' : `開始第 ${currentStage} 關`}
        disabled={progressState.isComplete}
        onPress={() => {
          if (!progressState.isComplete) {
            router.push(`/(app)/roadmap/stage/${currentStage}`);
          }
        }}
      />
    </ScreenScaffold>
  );
}
