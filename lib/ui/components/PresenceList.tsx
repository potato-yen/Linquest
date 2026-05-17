import React from 'react';
import { View, FlatList } from 'react-native';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { Avatar } from './Avatar';
import { color, radius, space } from '../tokens';

export interface PresenceListEntry {
  user_id: string;
  display_name: string;
  group_id: string;
  group_color: string;
  in_battle: boolean;
}

export function PresenceList({
  entries,
  onChallenge,
}: {
  entries: PresenceListEntry[];
  onChallenge: (userId: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <Text color="muted" style={{ textAlign: 'center', padding: space[5] }}>
        目前沒有他組玩家在線。
      </Text>
    );
  }
  return (
    <FlatList
      data={entries}
      keyExtractor={(e) => e.user_id}
      contentContainerStyle={{ padding: space[3], gap: space[2] }}
      renderItem={({ item }) => (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[3],
          padding: space[3],
          backgroundColor: color.bg.surface,
          borderRadius: radius.md,
        }}>
          <Avatar name={item.display_name} tint={item.group_color} />
          <View style={{ flex: 1 }}>
            <Text>{item.display_name}</Text>
            <Text variant="caption" color="muted">{item.in_battle ? '對戰中' : '在線'}</Text>
          </View>
          <Pressable
            onPress={() => !item.in_battle && onChallenge(item.user_id)}
            style={{
              padding: space[2],
              borderRadius: radius.md,
              backgroundColor: item.in_battle ? color.bg.muted : color.brand.primary,
              opacity: item.in_battle ? 0.5 : 1,
            }}
          >
            <Text style={{ color: color.text.onPrimary }}>挑戰</Text>
          </Pressable>
        </View>
      )}
    />
  );
}
