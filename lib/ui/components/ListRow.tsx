import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { Icon } from './Icon';
import { color, radius, space } from '../tokens';

export function ListRow({ left, title, subtitle, onPress }: {
  left?: React.ReactNode; title: string; subtitle?: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <Text>{title}</Text>
        {subtitle ? <Text variant="caption" color="muted">{subtitle}</Text> : null}
      </View>
      {onPress ? <Icon name="chevron-right" size={16} color={color.text.muted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[3], paddingHorizontal: space[4],
    backgroundColor: color.bg.surface, borderRadius: radius.md,
  },
});
