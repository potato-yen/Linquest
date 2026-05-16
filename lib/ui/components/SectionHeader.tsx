import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Pressable } from './Pressable';
import { space } from '../tokens';

export function SectionHeader({ eyebrow, title, rightLabel, onRightPress, style }: {
  eyebrow?: string; title: string; rightLabel?: string; onRightPress?: () => void; style?: ViewStyle;
}) {
  return (
    <View style={[{ gap: space[1] }, style]}>
      {eyebrow ? <Text variant="caption" color="muted">{eyebrow}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="h3">{title}</Text>
        {rightLabel ? <Pressable onPress={onRightPress}><Text color="brand">{rightLabel}</Text></Pressable> : null}
      </View>
    </View>
  );
}
