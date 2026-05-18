// lib/ui/components/icon-glyphs.tsx
// Phase 4: hand-drawn line icon set replacing @expo/vector-icons Feather.
// Design language §5: 線條為主、極細描邊、手繪/植物圖鑑感、避免幾何規整。
// Each glyph: viewBox 0 0 24 24, single stroke colour, slight asymmetry.
import React from 'react';
import Svg, { Path, Polyline, Circle, Line, G } from 'react-native-svg';

export type GlyphProps = { size: number; color: string };

const base = (color: string) => ({
  stroke: color,
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

function Frame({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

// home — a cabin with a slightly hand-tilted roofline.
export function HomeGlyph({ size, color }: GlyphProps) {
  return (
    <Frame size={size}>
      <G {...base(color)}>
        <Path d="M3.4 11.2 12 4.2 20.6 11.4" />
        <Path d="M5.2 10.6V19a1 1 0 0 0 1 1H10v-5.4h4V20h3.8a1 1 0 0 0 1-1v-8.3" />
      </G>
    </Frame>
  );
}

// map — a folded explorer's map (roadmap tab: 山徑/地圖意象).
export function MapGlyph({ size, color }: GlyphProps) {
  return (
    <Frame size={size}>
      <G {...base(color)}>
        <Path d="M9 4.4 3.6 6.6V20l5.4-2.3 6 2.3 5.4-2.2V4.4L15 6.7Z" />
        <Path d="M9 4.4v13.3" />
        <Path d="M15 6.7V20" />
      </G>
    </Frame>
  );
}

// hexagon — territory tab; the core map motif, lightly irregular.
export function HexagonGlyph({ size, color }: GlyphProps) {
  return (
    <Frame size={size}>
      <G {...base(color)}>
        <Path d="M12 3.4 19.4 7.5V16L12 20.4 4.6 16.1V7.6Z" />
      </G>
    </Frame>
  );
}

// grid — console/ledger tab; four hand-drawn cells.
export function GridGlyph({ size, color }: GlyphProps) {
  return (
    <Frame size={size}>
      <G {...base(color)}>
        <Path d="M4.2 4.4h6.4v6.2H4.2Z" />
        <Path d="M13.4 4.2h6.4v6.4H13.4Z" />
        <Path d="M4.4 13.4h6.2v6.4H4.4Z" />
        <Path d="M13.4 13.6h6.4v6.2h-6.4Z" />
      </G>
    </Frame>
  );
}

// user — a quiet portrait silhouette.
export function UserGlyph({ size, color }: GlyphProps) {
  return (
    <Frame size={size}>
      <G {...base(color)}>
        <Circle cx={12} cy={8.4} r={3.6} />
        <Path d="M5 19.4c.6-3.7 3.5-5.6 7-5.6s6.4 1.9 7 5.6" />
      </G>
    </Frame>
  );
}

function Chevron({ size, color, points }: GlyphProps & { points: string }) {
  return (
    <Frame size={size}>
      <Polyline points={points} {...base(color)} />
    </Frame>
  );
}
export const ChevronRightGlyph = (p: GlyphProps) => <Chevron {...p} points="9,5 16,12 9,19" />;
export const ChevronLeftGlyph = (p: GlyphProps) => <Chevron {...p} points="15,5 8,12 15,19" />;
export const ChevronUpGlyph = (p: GlyphProps) => <Chevron {...p} points="5,15 12,8 19,15" />;
export const ChevronDownGlyph = (p: GlyphProps) => <Chevron {...p} points="5,9 12,16 19,9" />;

// check — an ink tick with slight overshoot.
export function CheckGlyph({ size, color }: GlyphProps) {
  return (
    <Frame size={size}>
      <Polyline points="4.5,12.5 9.5,18 19.5,6" {...base(color)} />
    </Frame>
  );
}

// volume-2 — a horn with two sound arcs (used on audio prompts).
export function Volume2Glyph({ size, color }: GlyphProps) {
  return (
    <Frame size={size}>
      <G {...base(color)}>
        <Path d="M4 9.5h3.4L12 5.4v13.2L7.4 14.5H4Z" />
        <Path d="M15.6 9.2a4 4 0 0 1 0 5.6" />
        <Path d="M17.8 7a7 7 0 0 1 0 10" />
      </G>
    </Frame>
  );
}
