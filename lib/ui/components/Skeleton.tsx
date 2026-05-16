// lib/ui/components/Skeleton.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, ViewStyle } from 'react-native';
import { color, radius } from '../tokens';

export function Skeleton({ width = '100%', height = 12, style }: { width?: DimensionValue; height?: DimensionValue; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ width, height, borderRadius: radius.sm, backgroundColor: color.bg.sunken, opacity }, style]} />;
}
