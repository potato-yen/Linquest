// app/battle/[battleId].tsx
import React from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { ScreenScaffold, Text, Button } from '../../lib/ui/components';

export default function BattleModal() {
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  return (
    <ScreenScaffold>
      <Text variant="h1">1v1 對戰</Text>
      <Text color="muted">battle id: {battleId}</Text>
      <Text color="muted">Phase 3 將填上同步對戰房內容。</Text>
      <Button title="關閉" variant="ghost" onPress={() => router.back()} />
    </ScreenScaffold>
  );
}
