import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { space, groupPalette } from '../tokens';
import { GroupCrest } from '../illustrations';

export function RankRow({ rank, color: c, name, value, isMine }: {
  rank: number; color: string; name: string; value: string | number; isMine?: boolean;
}) {
  const crestIndex = groupPalette.indexOf(c as (typeof groupPalette)[number]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] }}>
      <Text variant="num" style={{ width: 28, textAlign: 'right' }}>{rank}</Text>
      {crestIndex >= 0
        ? <GroupCrest index={crestIndex} size={22} />
        : <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c }} />}
      <Text variant="body" style={{ flex: 1, fontWeight: isMine ? '600' : '400' }}>{name}{isMine ? ' · 我隊' : ''}</Text>
      <Text variant="num">{String(value)}</Text>
    </View>
  );
}
