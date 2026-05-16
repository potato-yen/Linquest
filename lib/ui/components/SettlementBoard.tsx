import React from 'react';
import { View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { RankRow } from './RankRow';
import { space } from '../tokens';

interface RankingEntry { group_id: string; name: string; color: string; rank: number; value: number; }

export function SettlementBoard({ title, rankings, valueLabel, myGroupId }: {
  title: string; rankings: RankingEntry[]; valueLabel: string; myGroupId?: string | null;
}) {
  return (
    <Card padding={4}>
      <Text variant="h3">{title}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] }}>
        <Text variant="caption" color="muted">隊伍</Text>
        <Text variant="caption" color="muted">{valueLabel}</Text>
      </View>
      {rankings.map((r) => (
        <RankRow key={r.group_id} rank={r.rank} color={r.color} name={r.name} value={r.value} isMine={r.group_id === myGroupId} />
      ))}
    </Card>
  );
}
