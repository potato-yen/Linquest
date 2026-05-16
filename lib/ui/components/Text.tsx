// lib/ui/components/Text.tsx
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { color, type as typeTokens } from '../tokens';

type Variant = keyof typeof typeTokens; // h1 h2 h3 body label caption num
type Color = 'primary' | 'secondary' | 'muted' | 'onPrimary' | 'brand' | 'warm';

const COLOR_MAP: Record<Color, string> = {
  primary: color.text.primary,
  secondary: color.text.secondary,
  muted: color.text.muted,
  onPrimary: color.text.onPrimary,
  brand: color.brand.primary,
  warm: color.accent.warm,
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: Color;
}

export function Text({ variant = 'body', color: c = 'primary', style, ...rest }: TextProps) {
  return <RNText {...rest} style={StyleSheet.flatten([typeTokens[variant], { color: COLOR_MAP[c] }, style])} />;
}
