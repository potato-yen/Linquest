// lib/ui/components/StageFlag.tsx
import React, { useEffect } from 'react';
import { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import Reanimated, {
  useSharedValue, useAnimatedProps, withTiming, withSequence, withDelay, Easing,
} from 'react-native-reanimated';
import { color } from '../tokens';

export type StageState = 'done' | 'current' | 'locked' | 'final';

const PALETTE: Record<StageState, { fill: string; stroke: string; pole: string; label: string }> = {
  done: {
    fill: color.brand.primary,
    stroke: color.brand.primaryHover,
    pole: color.brand.primaryHover,
    label: color.bg.surface,
  },
  current: {
    fill: '#C79A5B',
    stroke: color.accent.warm,
    pole: color.text.primary,
    label: color.bg.surface,
  },
  locked: {
    fill: color.bg.sunken,
    stroke: '#BDB39D',
    pole: color.text.muted,
    label: color.bg.muted,
  },
  final: {
    fill: color.text.primary,
    stroke: '#D4AC4A',
    pole: color.text.primary,
    label: color.bg.surface,
  },
};

const AnimatedG = Reanimated.createAnimatedComponent(G);
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);
const EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

function FlagBody({ x, y, stage, state, isDue }: { x: number; y: number; stage: number; state: StageState; isDue?: boolean }) {
  const p = PALETTE[state];
  const isPlayable = state === 'current' || state === 'final';
  const banner = `M ${x - 2} ${y - 20} C ${x + 7} ${y - 25}, ${x + 17} ${y - 17}, ${x + 27} ${y - 21} L ${x + 27} ${y - 2} C ${x + 17} ${y + 2}, ${x + 7} ${y - 6}, ${x - 2} ${y - 1} Z`;

  return (
    <G>
      <Ellipse cx={x} cy={y + 23} rx={12} ry={3.5} fill={color.text.muted} opacity={0.16} />
      <Line x1={x} y1={y - 21} x2={x} y2={y + 18} stroke={p.pole} strokeWidth={2} strokeLinecap="round" />
      <Path d={banner} fill={p.fill} stroke={p.stroke} strokeWidth={1.5} strokeLinejoin="round" />
      <Circle cx={x} cy={y + 5} r={12} fill={p.label} stroke={p.stroke} strokeWidth={1.5} />
      <SvgText
        x={x}
        y={y + 9}
        fontSize="10"
        fill={state === 'locked' ? color.text.muted : color.text.primary}
        textAnchor="middle"
      >
        {stage}
      </SvgText>
      {isPlayable && (
        <Rect
          x={x - 21}
          y={y + 28}
          width={42}
          height={20}
          rx={8}
          fill={color.bg.surface}
          stroke={p.stroke}
          strokeWidth={1}
        />
      )}
      {isPlayable && (
        <SvgText x={x} y={y + 42} fontSize="10" fill={color.text.secondary} textAnchor="middle">
          {state === 'final' ? '終點' : '目前'}
        </SvgText>
      )}
      {isDue && (
        <Circle cx={x + 28} cy={y - 21} r={5} fill={color.accent.warm} stroke={color.bg.base} strokeWidth={1.5} />
      )}
    </G>
  );
}

// Just-unlocked: scale 0.6→1 over 400ms ease-out + a golden halo whose
// opacity rises then fades over 800ms (spec §7 stage.unlock).
function UnlockedFlag({ x, y, stage, isDue }: { x: number; y: number; stage: number; isDue?: boolean }) {
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
        <FlagBody x={x} y={y} stage={stage} state="current" isDue={isDue} />
      </AnimatedG>
    </G>
  );
}

// Idle current stage: one gentle ±4px vertical hover after auto-scroll
// brings it into view — a scroll hint (spec §7 trail.scrollHint).
function HintFlag({ x, y, stage, isDue }: { x: number; y: number; stage: number; isDue?: boolean }) {
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
      <FlagBody x={x} y={y} stage={stage} state="current" isDue={isDue} />
    </AnimatedG>
  );
}

export function StageFlag({ x, y, stage, state, justUnlocked, isDue }: {
  x: number; y: number; stage: number; state: StageState; justUnlocked?: boolean; isDue?: boolean;
}) {
  if (state === 'current') {
    return justUnlocked
      ? <UnlockedFlag x={x} y={y} stage={stage} isDue={isDue} />
      : <HintFlag x={x} y={y} stage={stage} isDue={isDue} />;
  }
  return <FlagBody x={x} y={y} stage={stage} state={state} isDue={isDue} />;
}
