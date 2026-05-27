// lib/ui/components/RoadmapTrail.tsx
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { Pressable } from './Pressable';
import { StageFlag, StageState } from './StageFlag';
import { stagePosition } from '../trail/trail-layout';
import { buildTrailPath } from '../trail/trail-path';
import { color, radius } from '../tokens';

export interface RoadmapTrailProps {
  lastStage: number;
  currentStage: number;          // = first un-cleared stage
  width: number;
  height: number;                // typically larger than viewport; user scrolls
  onPressStage: (stage: number) => void;
  justUnlockedStage?: number;    // play the unlock burst on this stage flag once
  dueStages?: Set<number>;      // stages that have questions due for review
}

export function RoadmapTrail({ lastStage, currentStage, width, height, onPressStage, justUnlockedStage, dueStages }: RoadmapTrailProps) {
  const d = buildTrailPath({ lastStage, viewport: { width, height } });
  const completedUntil = Math.min(Math.max(currentStage, 1), lastStage);
  const completedPath = buildPartialTrailPath({ lastStage, untilStage: completedUntil, viewport: { width, height } });
  const summitX = width / 2;

  return (
    <View
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius.lg,
        backgroundColor: color.bg.surface,
        borderWidth: 1,
        borderColor: color.bg.muted,
      }}
    >
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={color.bg.surface} />
        <G opacity={0.28}>
          {Array.from({ length: Math.max(4, Math.floor(height / 160)) }, (_, i) => {
            const y = 80 + i * 150;
            const offset = i % 2 === 0 ? -30 : 40;
            return (
              <Path
                key={`contour-${i}`}
                d={`M ${-20} ${y} C ${width * 0.25} ${y - 35}, ${width * 0.48} ${y + 42}, ${width + 20} ${y + offset}`}
                stroke="#CDBF9D"
                strokeWidth={1}
                fill="none"
              />
            );
          })}
        </G>
        <G opacity={0.38}>
          {Array.from({ length: Math.max(5, Math.floor(height / 190)) }, (_, i) => {
            const y = 120 + i * 185;
            const x = i % 2 === 0 ? width - 54 : 34;
            return (
              <G key={`tree-${i}`}>
                <Line x1={x} y1={y + 14} x2={x} y2={y + 28} stroke={color.text.secondary} strokeWidth={1.3} />
                <Ellipse cx={x} cy={y + 7} rx={8} ry={13} fill={color.brand.primaryMuted} />
                <Line x1={x} y1={y + 2} x2={x - 5} y2={y + 10} stroke={color.bg.surface} strokeWidth={1} />
                <Line x1={x} y1={y + 5} x2={x + 5} y2={y + 13} stroke={color.bg.surface} strokeWidth={1} />
              </G>
            );
          })}
        </G>
        <G opacity={0.34}>
          <Path
            d={`M ${summitX - 80} 96 L ${summitX - 34} 32 L ${summitX + 4} 88 L ${summitX + 34} 52 L ${summitX + 84} 100 Z`}
            fill={color.bg.muted}
            stroke="#CDBF9D"
            strokeWidth={1}
          />
          <Path
            d={`M ${summitX - 34} 32 L ${summitX - 18} 56 L ${summitX - 44} 54 Z M ${summitX + 34} 52 L ${summitX + 24} 68 L ${summitX + 48} 67 Z`}
            fill={color.bg.surface}
            opacity={0.8}
          />
        </G>
        <Path d={d} stroke="#CDBF9D" strokeWidth={24} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.42} />
        <Path d={d} stroke="#F4EBD8" strokeWidth={18} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={d} stroke="#B8A986" strokeWidth={1.2} fill="none" strokeDasharray="6 8" strokeLinecap="round" opacity={0.7} />
        {completedPath.length > 0 && (
          <Path
            d={completedPath}
            stroke={color.brand.primary}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.78}
          />
        )}
        <Circle cx={summitX + 58} cy={54} r={3} fill={color.accent.warm} />
        {Array.from({ length: lastStage }, (_, i) => {
          const s = i + 1;
          const pos = stagePosition({ stage: s, lastStage, viewport: { width, height } });
          const state: StageState =
            s < currentStage ? 'done' :
            s === currentStage && s === lastStage ? 'final' :
            s === currentStage ? 'current' : 'locked';
          return (
            <StageFlag
              key={s}
              x={pos.x}
              y={pos.y}
              stage={s}
              state={state}
              justUnlocked={s === justUnlockedStage}
              isDue={dueStages?.has(s)}
            />
          );
        })}
      </Svg>
      {Array.from({ length: lastStage }, (_, i) => {
        const s = i + 1;
        const pos = stagePosition({ stage: s, lastStage, viewport: { width, height } });
        return (
          // Wrapper View carries the absolute position; Pressable's style goes
          // to its inner Animated.View, so position: absolute must be on the outer View.
          <View
            key={s}
            style={{ position: 'absolute', left: pos.x - 24, top: pos.y - 24 }}
          >
            <Pressable
              onPress={() => onPressStage(s)}
              accessibilityLabel={`stage-${s}`}
              style={{ width: 48, height: 48 }}
            />
          </View>
        );
      })}
    </View>
  );
}

function buildPartialTrailPath(opts: {
  lastStage: number;
  untilStage: number;
  viewport: { width: number; height: number };
}): string {
  const count = Math.min(opts.untilStage, opts.lastStage);
  const points = Array.from({ length: count }, (_, i) =>
    stagePosition({ stage: i + 1, lastStage: opts.lastStage, viewport: opts.viewport }),
  );
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], cur = points[i];
    const cx = (prev.x + cur.x) / 2;
    d += ` Q ${cx} ${prev.y} ${cur.x} ${cur.y}`;
  }
  return d;
}
