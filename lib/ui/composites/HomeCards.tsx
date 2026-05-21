// lib/ui/composites/HomeCards.tsx
import React from 'react';
import { View } from 'react-native';
import { Card, Text } from '../components';
import { Pressable } from '../components/Pressable';
import { Icon } from '../components/Icon';
import { ProgressBar } from '../components/ProgressBar';
import { space, color } from '../tokens';

// "今日任務" is not a spec'd daily quota — there is no per-day progress data
// (roadmap_progress only stores current_stage), so a done/total bar could
// never fill. It is a plain tappable shortcut to the next stage.
export function TodayTaskCard({ stageLabel, onPress, isDue }: { stageLabel: string; onPress: () => void; isDue?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="today-task">
      <Card padding={4} style={isDue ? { borderColor: color.accent.warm, borderWidth: 1 } : undefined}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="caption" color="muted">今日任務</Text>
          {isDue && (
            <View style={{ backgroundColor: color.accent.warm, paddingHorizontal: space[2], paddingVertical: 2, borderRadius: 10 }}>
              <Text variant="caption" style={{ color: color.bg.base, fontSize: 9 }}>待複習</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: space[2] }}>
            <Text color="muted">下一關</Text>
            <Text variant="h3">{stageLabel}</Text>
          </View>
          <Icon name="chevron-right" size={20} color={color.text.muted} />
        </View>
      </Card>
    </Pressable>
  );
}

export function RoadmapProgressCard({ levelLabel, progress }: { levelLabel: string; progress: number }) {
  return (
    <Card padding={4}>
      <Text variant="caption" color="muted">Roadmap</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] }}>
        <Text>{levelLabel}</Text>
        <Text color="brand">{Math.round(progress * 100)}%</Text>
      </View>
      <View style={{ marginTop: space[2] }}>
        <ProgressBar progress={progress} />
      </View>
    </Card>
  );
}

export function BattleStatusCard({
  activityName,
  myScore,
  secondScore,
}: {
  activityName: string;
  myScore: number;
  secondScore: number;
}) {
  return (
    <Card padding={4} style={{ borderColor: color.brand.primaryMuted, borderWidth: 1 }}>
      <Text variant="caption" color="muted">對戰戰況</Text>
      <Text color="muted" style={{ fontSize: 11, marginTop: 2 }}>{activityName}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] }}>
        <View>
          <Text variant="caption" color="muted">我隊</Text>
          <Text variant="num" style={{ fontSize: 22 }}>{myScore.toLocaleString()}</Text>
        </View>
        <Text color="muted" style={{ alignSelf: 'center' }}>vs</Text>
        <View>
          <Text variant="caption" color="muted">第二</Text>
          <Text variant="num" style={{ fontSize: 22, color: color.text.muted }}>{secondScore.toLocaleString()}</Text>
        </View>
      </View>
    </Card>
  );
}

export function BattleStatusPlaceholderCard() {
  // Phase 3 wires real activity score; phase 1 ships an explicit placeholder so home composition matches spec.
  return (
    <Card padding={4} style={{ borderWidth: 1, borderColor: color.bg.sunken, opacity: 0.7 }}>
      <Text variant="caption" color="muted">對戰戰況</Text>
      <Text color="muted" style={{ marginTop: space[2] }}>還沒進行中的活動</Text>
    </Card>
  );
}
