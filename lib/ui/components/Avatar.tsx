// lib/ui/components/Avatar.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { color } from '../tokens';

export function Avatar({ name, size = 'md', tint }: { name?: string | null; size?: 'sm' | 'md' | 'lg'; tint?: string }) {
  const px = size === 'sm' ? 24 : size === 'md' ? 36 : 56;
  const initial = name?.trim()?.[0]?.toUpperCase() ?? '?';
  return (
    <View style={[styles.av, { width: px, height: px, borderRadius: px / 2, backgroundColor: tint ?? color.brand.primaryMuted }]}>
      <Text variant="label" style={{ color: color.text.onPrimary }}>{initial}</Text>
    </View>
  );
}
const styles = StyleSheet.create({ av: { alignItems: 'center', justifyContent: 'center' } });
