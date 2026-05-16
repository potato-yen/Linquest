// lib/ui/components/StageFlag.tsx
import React from 'react';
import { Circle, G, Text as SvgText } from 'react-native-svg';
import { color } from '../tokens';

export type StageState = 'done' | 'current' | 'locked' | 'final';

const PALETTE: Record<StageState, { fill: string; stroke: string; r: number }> = {
  done:    { fill: color.brand.primary, stroke: color.brand.primaryHover, r: 8 },
  current: { fill: '#D4AC4A',           stroke: color.text.primary,        r: 11 },
  locked:  { fill: color.bg.sunken,     stroke: color.text.muted,          r: 7 },
  final:   { fill: color.text.primary,  stroke: '#D4AC4A',                 r: 9 },
};

export function StageFlag({ x, y, stage, state }: { x: number; y: number; stage: number; state: StageState }) {
  const p = PALETTE[state];
  return (
    <G>
      <Circle cx={x} cy={y} r={p.r} fill={p.fill} stroke={p.stroke} strokeWidth={2} />
      {state === 'current' ? (
        <SvgText x={x} y={y + 4} fontSize="10" fill={color.text.primary} textAnchor="middle">{stage}</SvgText>
      ) : null}
    </G>
  );
}
