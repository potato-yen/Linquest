// lib/ui/components/Button.tsx
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { color, radius, space } from '../tokens';

type Variant = 'primary' | 'ghost' | 'destructive';
type Size = 'md' | 'sm';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const STYLES = {
  primary: { bg: color.brand.primary, fg: color.text.onPrimary },
  ghost: { bg: 'transparent', fg: color.brand.primary },
  destructive: { bg: color.accent.warm, fg: color.text.onPrimary },
};

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, accessibilityLabel,
}: ButtonProps) {
  const v = STYLES[variant];
  const isInactive = disabled || loading;
  const padV = size === 'md' ? space[3] : space[2];
  const padH = size === 'md' ? space[5] : space[4];

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityLabel={accessibilityLabel ?? title}
      style={[
        styles.btn,
        { backgroundColor: v.bg, paddingVertical: padV, paddingHorizontal: padH },
        variant === 'ghost' && { borderWidth: 1, borderColor: color.brand.primary },
        isInactive && styles.inactive,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={v.fg} size="small" />
        ) : (
          <Text variant="label" style={{ color: v.fg, fontWeight: '600' }}>{title}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inactive: { opacity: 0.5 },
});
