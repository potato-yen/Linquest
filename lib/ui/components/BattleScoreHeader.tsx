import React from 'react';
import { View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { Avatar } from './Avatar';
import { Countdown } from './Countdown';
import { color, space } from '../tokens';

export interface SidePresence {
  display_name: string;
  group_color: string;
  score: number;
  isMe: boolean;
}

export function BattleScoreHeader({
  self,
  opponent,
  questionIndex,
  total,
  deadline,
}: {
  self: SidePresence;
  opponent: SidePresence;
  questionIndex: number;
  total: number;
  deadline: string | null;
}) {
  return (
    <Card padding={3}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Side side={self} />
        <View style={{ flex: 1, alignItems: 'center', gap: space[1] }}>
          <Text variant="caption" color="muted">第 {questionIndex + 1} 題 / {total}</Text>
          <Countdown deadline={deadline} />
        </View>
        <Side side={opponent} />
      </View>
    </Card>
  );
}

function Side({ side }: { side: SidePresence }) {
  return (
    <View style={{ alignItems: 'center', flex: 1, gap: space[1] }}>
      <Avatar name={side.display_name} tint={side.group_color} />
      <Text variant="caption" color="muted">{side.display_name}{side.isMe ? '（你）' : ''}</Text>
      <Text variant="num" style={{ color: side.group_color, fontSize: 22 }}>{side.score}</Text>
    </View>
  );
}
