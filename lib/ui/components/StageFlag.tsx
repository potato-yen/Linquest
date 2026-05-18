// lib/ui/components/StageFlag.tsx
import React, { useEffect } from 'react';
import { Circle, G, Text as SvgText } from 'react-native-svg';
import Reanimated, {
  useSharedValue, useAnimatedProps, withTiming, withSequence, withDelay, Easing,
} from 'react-native-reanimated';
import { color } from '../tokens';

export type StageState = 'done' | 'current' | 'locked' | 'final';

const PALETTE: Record<StageState, { fill: string; stroke: string; r: number }> = {
  done:    { fill: color.brand.primary, stroke: color.brand.primaryHover, r: 8 },
  current: { fill: '#D4AC4A',           stroke: color.text.primary,        r: 11 },
  locked:  { fill: color.bg.sunken,     stroke: color.text.muted,          r: 7 },
  final:   { fill: color.text.primary,  stroke: '#D4AC4A',                 r: 9 },
};

const AnimatedG = Reanimated.createAnimatedComponent(G);
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

// The current stage gives one gentle vertical "hover" after the trail
// auto-scrolls it into view — a scroll hint (spec §7 trail.scrollHint).
function CurrentFlag({ x, y, stage }: { x: number; y: number; stage: number }) {
  const p = PALETTE.current;
  const dy = useSharedValue(0);
  useEffect(() => {
    dy.value = withDelay(
      500,
      withSequence(
        withTiming(-4, { duration: 380, easing: EASE }),
        withTiming(4, { duration: 380, easing: EASE }),
        withTiming(0, { duration: 380, easing: EASE }),
      ),
    );
  }, [dy]);
  const animatedProps = useAnimatedProps(() => ({ transform: [{ translateY: dy.value }] }));
  return (
    <AnimatedG animatedProps={animatedProps}>
      <Circle cx={x} cy={y} r={p.r} fill={p.fill} stroke={p.stroke} strokeWidth={2} />
      <SvgText x={x} y={y + 4} fontSize="10" fill={color.text.primary} textAnchor="middle">{stage}</SvgText>
    </AnimatedG>
  );
}

export function StageFlag({ x, y, stage, state }: { x: number; y: number; stage: number; state: StageState }) {
  if (state === 'current') return <CurrentFlag x={x} y={y} stage={stage} />;
  const p = PALETTE[state];
  return (
    <G>
      <Circle cx={x} cy={y} r={p.r} fill={p.fill} stroke={p.stroke} strokeWidth={2} />
    </G>
  );
}
