// lib/ui/components/Badge.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { color, radius, space } from '../tokens';

export type BadgeVariant = 'neutral' | 'brand' | 'warm' | 'destructive' | 'primary' | 'success';

const PALETTE: Record<BadgeVariant, { bg: string; fg: string }> = {
  neutral: { bg: color.bg.sunken, fg: color.text.secondary },
  brand: { bg: color.brand.primaryMuted, fg: color.text.primary },
  primary: { bg: color.brand.primaryMuted, fg: color.text.primary },
  success: { bg: color.brand.primaryMuted, fg: color.text.primary },
  warm: { bg: color.accent.warmMuted, fg: color.accent.warm },
  destructive: { bg: color.accent.warmMuted, fg: color.accent.warm },
};

export function Badge({ children, variant = 'neutral' }: { children: string; variant?: BadgeVariant }) {
  const p = PALETTE[variant] || PALETTE.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: p.bg }]}>
      <Text variant="caption" style={{ color: p.fg }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: space[1], paddingHorizontal: space[2], borderRadius: radius.sm, alignSelf: 'flex-start' },
});
