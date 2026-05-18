// lib/ui/illustrations/GroupCrest.tsx
// One parametric shield crest, index 0..9. Shield tinted by `fill`
// (defaults to groupPalette[index]); inner motif in ink. viewBox 0 0 64 72.
import React from 'react';
import Svg, { Path, Circle, Line, Polyline, G } from 'react-native-svg';
import { color, groupPalette } from '../tokens';

const INK = color.text.primary; // #2C3E1F

const SHIELD = 'M32 4 L58 12 L58 36 C58 54 46 64 32 70 C18 64 6 54 6 36 L6 12 Z';

const m = {
  stroke: INK,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
};

// 0 acorn · 1 leaf · 2 wave · 3 berry · 4 fern · 5 sun · 6 moon · 7 flame · 8 mountain · 9 anchor
function Motif({ index }: { index: number }) {
  switch (((index % 10) + 10) % 10) {
    case 0: // acorn
      return (
        <G {...m}>
          <Path d="M24 30 q8 -10 16 0 q-2 4 -8 4 q-6 0 -8 -4 Z" />
          <Path d="M32 34 q-7 2 -7 12 q0 8 7 10 q7 -2 7 -10 q0 -10 -7 -12" />
          <Line x1={32} y1={20} x2={32} y2={28} />
        </G>
      );
    case 1: // leaf
      return (
        <G {...m}>
          <Path d="M32 22 C 44 30, 44 48, 32 56 C 20 48, 20 30, 32 22 Z" />
          <Line x1={32} y1={26} x2={32} y2={54} />
          <Path d="M32 34 l7 -3 M32 42 l7 -3 M32 34 l-7 -3 M32 42 l-7 -3" />
        </G>
      );
    case 2: // wave
      return (
        <G {...m}>
          <Path d="M16 34 q6 -7 12 0 t12 0 t12 0" />
          <Path d="M16 44 q6 -7 12 0 t12 0 t12 0" />
        </G>
      );
    case 3: // berry
      return (
        <G {...m}>
          <Circle cx={26} cy={42} r={6} />
          <Circle cx={38} cy={42} r={6} />
          <Circle cx={32} cy={32} r={6} />
          <Line x1={32} y1={26} x2={32} y2={20} />
        </G>
      );
    case 4: // fern
      return (
        <G {...m}>
          <Path d="M32 56 q4 -22 0 -36" />
          <Path d="M32 48 q-8 -2 -10 -8 M32 48 q8 -2 10 -8 M32 40 q-7 -2 -9 -7 M32 40 q7 -2 9 -7 M32 32 q-5 -2 -6 -6 M32 32 q5 -2 6 -6" />
        </G>
      );
    case 5: // sun
      return (
        <G {...m}>
          <Circle cx={32} cy={40} r={8} />
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <Line
                key={i}
                x1={32 + 11 * Math.cos(a)}
                y1={40 + 11 * Math.sin(a)}
                x2={32 + 16 * Math.cos(a)}
                y2={40 + 16 * Math.sin(a)}
              />
            );
          })}
        </G>
      );
    case 6: // moon
      return (
        <G {...m}>
          <Path d="M40 26 A 16 16 0 1 0 40 56 A 13 13 0 1 1 40 26 Z" />
        </G>
      );
    case 7: // flame
      return (
        <G {...m}>
          <Path d="M32 22 C 42 32, 42 42, 36 48 C 40 44, 40 38, 38 36 C 40 46, 34 56, 26 52 C 20 48, 22 38, 30 34 C 28 40, 30 44, 32 44 C 28 38, 30 28, 32 22 Z" />
        </G>
      );
    case 8: // mountain
      return (
        <G {...m}>
          <Polyline points="18,52 30,32 38,44 46,28 56,52" />
          <Path d="M27 37 l3 3 3 -3 M43 33 l3 3 3 -3" />
        </G>
      );
    default: // 9 anchor
      return (
        <G {...m}>
          <Circle cx={32} cy={24} r={4} />
          <Line x1={32} y1={28} x2={32} y2={54} />
          <Line x1={24} y1={34} x2={40} y2={34} />
          <Path d="M18 44 q0 14 14 14 q14 0 14 -14" />
        </G>
      );
  }
}

export type GroupCrestProps = { index: number; size?: number; fill?: string };

export function GroupCrest({ index, size = 64, fill }: GroupCrestProps) {
  const tint = fill ?? groupPalette[((index % 10) + 10) % 10];
  return (
    <Svg width={size} height={(size * 72) / 64} viewBox="0 0 64 72" fill="none">
      <Path d={SHIELD} fill={tint} fillOpacity={0.22} stroke={tint} strokeWidth={2.5} strokeLinejoin="round" />
      <Path d={SHIELD} stroke={color.bg.surface} strokeWidth={0.8} fill="none" opacity={0.5} />
      <Motif index={index} />
    </Svg>
  );
}
