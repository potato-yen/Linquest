// lib/ui/components/Icon.tsx
// Phase 4: custom hand-drawn SVG icon set (replaced Feather). API unchanged.
import React from 'react';
import { color } from '../tokens';
import {
  HomeGlyph, MapGlyph, HexagonGlyph, GridGlyph, UserGlyph,
  ChevronRightGlyph, ChevronLeftGlyph, ChevronUpGlyph, ChevronDownGlyph,
  CheckGlyph, Volume2Glyph,
} from './icon-glyphs';

const GLYPHS = {
  home: HomeGlyph,
  map: MapGlyph,
  hexagon: HexagonGlyph,
  grid: GridGlyph,
  user: UserGlyph,
  'chevron-right': ChevronRightGlyph,
  'chevron-left': ChevronLeftGlyph,
  'chevron-up': ChevronUpGlyph,
  'chevron-down': ChevronDownGlyph,
  check: CheckGlyph,
  'volume-2': Volume2Glyph,
} as const;

export type IconName = keyof typeof GLYPHS;

export function Icon({ name, size = 20, color: c = color.text.primary }: { name: IconName; size?: 16 | 20 | 24; color?: string }) {
  const G = GLYPHS[name];
  if (!G) return null;
  return <G size={size} color={c} />;
}
