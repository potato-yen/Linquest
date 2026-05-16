import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { space } from '../tokens';

export function ScoreCard({ label, value, variant = 'compact' }: { label: string; value: string | number; variant?: 'compact' | 'hero' }) {
  return (
    <View style={{ alignItems: 'center', gap: space[1] }}>
      <Text variant="caption" color="muted">{label}</Text>
      <Text variant={variant === 'hero' ? 'h1' : 'num'}>{String(value)}</Text>
    </View>
  );
}
