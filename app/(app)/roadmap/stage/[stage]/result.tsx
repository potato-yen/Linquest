// app/(app)/roadmap/stage/[stage]/result.tsx
import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenScaffold, Text, Button, Card } from '../../../../../lib/ui/components';
import { shouldUnlock } from '../../../../../lib/roadmap/unlock';
import { Attempt } from '../../../../../lib/answering/types';
import { color, space } from '../../../../../lib/ui/tokens';

export default function StageResult() {
  const { stage, fr } = useLocalSearchParams<{ stage: string; fr: string }>();
  const stageNum = Number(stage);
  const firstRound: Attempt[] = fr ? JSON.parse(fr) : [];
  const correct = firstRound.filter((a) => a.is_correct).length;
  const accuracy = firstRound.length > 0 ? correct / firstRound.length : 0;
  const unlocked = shouldUnlock(correct, firstRound.length);

  // Progress is saved by [stage].tsx onFinish before navigation; this page is
  // purely presentational.

  return (
    <ScreenScaffold scroll>
      <Text variant="h1">{unlocked ? '解鎖下一關' : '本關未解鎖'}</Text>
      <Card padding={5}>
        <Text variant="caption" color="muted">首輪正確率</Text>
        <Text variant="h1" style={{ color: unlocked ? color.brand.primary : color.accent.warm, marginTop: space[2] }}>
          {Math.round(accuracy * 100)}%
        </Text>
        <Text variant="body" color="muted" style={{ marginTop: space[1] }}>{correct} / {firstRound.length}</Text>
      </Card>
      {unlocked ? (
        <Text color="muted">門檻 80%。下一關 Stage {stageNum + 1} 已開放。</Text>
      ) : (
        <Text color="muted">門檻 80%。本關須重打（題目會重新亂序）。</Text>
      )}
      <View style={{ gap: space[2] }}>
        <Button title={unlocked ? `進入 Stage ${stageNum + 1}` : '重打本關'}
                onPress={() => router.replace(`/(app)/roadmap/stage/${unlocked ? stageNum + 1 : stageNum}`)} />
        <Button
          title="返回山徑"
          variant="ghost"
          onPress={() => router.replace(unlocked ? `/(app)/roadmap?unlocked=${stageNum + 1}` : '/(app)/roadmap')}
        />
      </View>
    </ScreenScaffold>
  );
}
