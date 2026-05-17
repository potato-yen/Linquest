// lib/ui/composites/HomeCards.tsx
import React from 'react';
import { View } from 'react-native';
import { Card, Text } from '../components';
import { ProgressBar } from '../components/ProgressBar';
import { space, color } from '../tokens';

export function TodayTaskCard({ stageLabel, doneToday, totalToday }: { stageLabel: string; doneToday: number; totalToday: number }) {
  return (
    <Card padding={4}>
      <Text variant="caption" color="muted">今日任務</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] }}>
        <Text>{stageLabel}</Text>
        <Text variant="num">{doneToday} / {totalToday}</Text>
      </View>
      <View style={{ marginTop: space[2] }}>
        <ProgressBar progress={totalToday > 0 ? doneToday / totalToday : 0} />
      </View>
    </Card>
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
