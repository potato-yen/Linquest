import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  withDelay,
  withTiming,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { motion } from '../tokens';

const COUNT = 8;

export function BattleWinFx({ color, active }: { color: string; active: boolean }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: COUNT }, (_, i) => (
        <Line key={i} index={i} color={color} active={active} />
      ))}
    </View>
  );
}

function Line({ index, color, active }: { index: number; color: string; active: boolean }) {
  const len = useSharedValue(0);
  const opacity = useSharedValue(0);
  const angle = (index / COUNT) * Math.PI * 2;
  const [b0, b1, b2, b3] = motion.ease.out;

  useEffect(() => {
    if (!active) return;
    const ease = Easing.bezier(b0, b1, b2, b3);
    len.value = withDelay(
      index * 40,
      withTiming(60, { duration: motion.duration.slow + 200, easing: ease }),
    );
    opacity.value = withDelay(
      index * 40,
      withTiming(1, { duration: 80 }, () => {
        opacity.value = withTiming(0, {
          duration: motion.duration.slow + 100,
          easing: ease,
        });
      }),
    );
  }, [active, index, len, opacity, b0, b1, b2, b3]);

  const style = useAnimatedStyle(() => ({
    width: len.value,
    height: 2,
    backgroundColor: color,
    opacity: opacity.value,
    transform: [{ rotate: `${angle}rad` }, { translateX: len.value / 2 }],
  }));

  return <Animated.View style={[{ position: 'absolute' }, style]} />;
}
