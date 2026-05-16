// lib/ui/components/Card.tsx
import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { color, radius, shadow, space } from '../tokens';

export interface CardProps extends ViewProps {
  padding?: keyof typeof space;
}

export function Card({ padding = 4, style, ...rest }: CardProps) {
  return <View {...rest} style={[styles.card, { padding: space[padding] }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bg.surface,
    borderRadius: radius.lg,
    ...shadow.soft,
  },
});
