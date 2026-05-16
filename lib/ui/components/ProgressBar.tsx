// lib/ui/components/ProgressBar.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { color, motion, radius } from '../tokens';

export function ProgressBar({ progress, height = 6 }: { progress: number; height?: number }) {
  const w = useRef(new Animated.Value(progress)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: progress, duration: motion.duration.base, useNativeDriver: false }).start();
  }, [progress, w]);

  return (
    <View style={{ width: '100%', height, backgroundColor: color.bg.sunken, borderRadius: radius.sm, overflow: 'hidden' }}>
      <Animated.View style={{
        height,
        width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] as any }),
        backgroundColor: color.brand.primary,
      }} />
    </View>
  );
}
