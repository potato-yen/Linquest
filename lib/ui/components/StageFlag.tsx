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
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

function FlagBody({ x, y, stage }: { x: number; y: number; stage: number }) {
  const p = PALETTE.current;
  return (
    <>
      <Circle cx={x} cy={y} r={p.r} fill={p.fill} stroke={p.stroke} strokeWidth={2} />
      <SvgText x={x} y={y + 4} fontSize="10" fill={color.text.primary} textAnchor="middle">{stage}</SvgText>
    </>
  );
}

// Just-unlocked: scale 0.6→1 over 400ms ease-out + a golden halo whose
// opacity rises then fades over 800ms (spec §7 stage.unlock).
function UnlockedFlag({ x, y, stage }: { x: number; y: number; stage: number }) {
  const sc = useSharedValue(0.6);
  const halo = useSharedValue(0);
  useEffect(() => {
    sc.value = withTiming(1, { duration: 400, easing: EASE });
    halo.value = withSequence(
      withTiming(0.6, { duration: 300, easing: EASE }),
      withTiming(0, { duration: 500, easing: EASE }),
    );
  }, [sc, halo]);
  const gProps = useAnimatedProps(() => ({
    transform: [
      { translateX: x }, { translateY: y },
      { scale: sc.value },
      { translateX: -x }, { translateY: -y },
    ],
  }));
  const haloProps = useAnimatedProps(() => ({ opacity: halo.value }));
  return (
    <G>
      <AnimatedCircle cx={x} cy={y} r={20} fill="#D4AC4A" animatedProps={haloProps} />
      <AnimatedG animatedProps={gProps}>
        <FlagBody x={x} y={y} stage={stage} />
      </AnimatedG>
    </G>
  );
}

// Idle current stage: one gentle ±4px vertical hover after auto-scroll
// brings it into view — a scroll hint (spec §7 trail.scrollHint).
function HintFlag({ x, y, stage }: { x: number; y: number; stage: number }) {
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
      <FlagBody x={x} y={y} stage={stage} />
    </AnimatedG>
  );
}

export function StageFlag({ x, y, stage, state, justUnlocked }: {
  x: number; y: number; stage: number; state: StageState; justUnlocked?: boolean;
}) {
  if (state === 'current') {
    return justUnlocked
      ? <UnlockedFlag x={x} y={y} stage={stage} />
      : <HintFlag x={x} y={y} stage={stage} />;
  }
  const p = PALETTE[state];
  return (
    <G>
      <Circle cx={x} cy={y} r={p.r} fill={p.fill} stroke={p.stroke} strokeWidth={2} />
    </G>
  );
}
