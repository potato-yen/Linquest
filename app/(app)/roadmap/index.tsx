// app/(app)/roadmap/index.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScreenScaffold, Text, Skeleton, ErrorState, Button, Card } from '../../../lib/ui/components';
import { RoadmapTrail } from '../../../lib/ui/components/RoadmapTrail';
import { useScreenData } from '../../../lib/ui/hooks/useScreenData';
import { useSession } from '../../../lib/ui/session/useSession';
import { getSupabaseClient } from '../../../lib/supabase';
import { getRoadmapBank, getProgress, getDueCountsPerLevel } from '../../../lib/roadmap/service';
import { deriveRoadmapProgressState } from '../../../lib/roadmap/progress';
import { ROADMAP_CONFIG } from '../../../lib/roadmap/roadmap-config';
import { stagePosition } from '../../../lib/ui/trail/trail-layout';
import { color, radius, space } from '../../../lib/ui/tokens';

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
    const [progress, dueCounts] = await Promise.all([
      getProgress(sb, s.user.id),
      getDueCountsPerLevel(sb, s.user.id),
    ]);
    const lastStage = bank.config.levels.reduce((m, l) => Math.max(m, l.stage_end), 1);

    // Map due levels to due stages
    const dueStages = new Set<number>();
    let totalDue = 0;
    for (const [levelStr, count] of Object.entries(dueCounts)) {
      const level = Number(levelStr);
      if (count > 0) {
        totalDue += count;
        const mapping = ROADMAP_CONFIG.levels.find((l) => l.level === level);
        if (mapping) {
          for (let stg = mapping.stage_start; stg <= mapping.stage_end; stg++) {
            dueStages.add(stg);
          }
        }
      }
    }

    return { bankId: bank.id, currentStage: progress?.current_stage ?? 1, lastStage, dueStages, totalDue };
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

  const { currentStage, lastStage, dueStages, totalDue } = state.data;
  const progressState = deriveRoadmapProgressState(currentStage, lastStage);
  const trailHeight = Math.max(win.height * 1.4, lastStage * 80);
  const completedStages = progressState.isComplete ? lastStage : Math.max(0, currentStage - 1);
  const progressRatio = lastStage > 0 ? completedStages / lastStage : 0;

  return (
    <ScreenScaffold>
      <Card padding={4} style={{ gap: space[3], borderWidth: 1, borderColor: color.bg.muted }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[3], alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color="brand">Roadmap</Text>
            <Text variant="h1">關卡進度</Text>
            <Text color="muted">
              {progressState.isComplete
                ? `已完成全部 ${lastStage} 關`
                : `目前在第 ${currentStage} 關，共 ${lastStage} 關`}
            </Text>
          </View>
          <View
            style={{
              minWidth: 76,
              borderRadius: radius.md,
              backgroundColor: color.bg.muted,
              paddingHorizontal: space[3],
              paddingVertical: space[2],
              alignItems: 'center',
            }}
          >
            <Text variant="num">{Math.round(progressRatio * 100)}%</Text>
            <Text variant="caption" color="muted">完成</Text>
          </View>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: color.bg.sunken, overflow: 'hidden' }}>
          <View style={{ width: `${Math.round(progressRatio * 100)}%`, height: '100%', backgroundColor: color.brand.primary }} />
        </View>
        {totalDue > 0 && (
          <View
            style={{
              borderRadius: radius.md,
              backgroundColor: color.accent.warmMuted,
              paddingHorizontal: space[3],
              paddingVertical: space[2],
            }}
          >
            <Text color="warm" variant="label">
              有 {totalDue} 個單字該複習了。點擊有紅色標記的關卡開始。
            </Text>
          </View>
        )}
      </Card>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: space[7] }}>
        <RoadmapTrail
          lastStage={lastStage}
          currentStage={progressState.playableStage}
          width={win.width - space[4] * 2}
          height={trailHeight}
          justUnlockedStage={justUnlockedRef.current}
          dueStages={dueStages}
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
