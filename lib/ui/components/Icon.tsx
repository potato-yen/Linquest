// lib/ui/components/Icon.tsx
import React from 'react';
import { Feather } from '@expo/vector-icons';
import { color } from '../tokens';

// Phase 4 will replace this with custom hand-drawn SVG set; the component API stays the same.
export type IconName = keyof typeof Feather.glyphMap;

export function Icon({ name, size = 20, color: c = color.text.primary }: { name: IconName; size?: 16 | 20 | 24; color?: string }) {
  return <Feather name={name} size={size} color={c} />;
}
