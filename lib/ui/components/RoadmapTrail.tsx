// lib/ui/components/RoadmapTrail.tsx
import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Pressable } from './Pressable';
import { StageFlag, StageState } from './StageFlag';
import { stagePosition } from '../trail/trail-layout';
import { buildTrailPath } from '../trail/trail-path';
import { color } from '../tokens';

export interface RoadmapTrailProps {
  lastStage: number;
  currentStage: number;          // = first un-cleared stage
  width: number;
  height: number;                // typically larger than viewport; user scrolls
  onPressStage: (stage: number) => void;
}

export function RoadmapTrail({ lastStage, currentStage, width, height, onPressStage }: RoadmapTrailProps) {
  const d = buildTrailPath({ lastStage, viewport: { width, height } });

  return (
    <View style={{ width, height, position: 'relative' }}>
      <Svg width={width} height={height}>
        <Path d={d} stroke={color.text.muted} strokeWidth={2} fill="none" strokeDasharray="4 4" />
        {Array.from({ length: lastStage }, (_, i) => {
          const s = i + 1;
          const pos = stagePosition({ stage: s, lastStage, viewport: { width, height } });
          const state: StageState =
            s < currentStage ? 'done' :
            s === currentStage && s === lastStage ? 'final' :
            s === currentStage ? 'current' : 'locked';
          return <StageFlag key={s} x={pos.x} y={pos.y} stage={s} state={state} />;
        })}
      </Svg>
      {Array.from({ length: lastStage }, (_, i) => {
        const s = i + 1;
        const pos = stagePosition({ stage: s, lastStage, viewport: { width, height } });
        return (
          <Pressable
            key={s}
            onPress={() => onPressStage(s)}
            accessibilityLabel={`stage-${s}`}
            style={{ position: 'absolute', left: pos.x - 18, top: pos.y - 18, width: 36, height: 36 }}
          />
        );
      })}
    </View>
  );
}
