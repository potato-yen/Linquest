// lib/ui/components/Toast.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Text } from './Text';
import { color, radius, space, motion } from '../tokens';

export interface ToastProps {
  visible: boolean;
  message: string;
  variant?: 'info' | 'warm';
  onHide?: () => void;
  durationMs?: number;
}

export function Toast({ visible, message, variant = 'info', onHide, durationMs = 4000 }: ToastProps) {
  const ty = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(ty, { toValue: 0, duration: motion.duration.fast + 40, useNativeDriver: true }).start();
      const t = setTimeout(() => {
        Animated.timing(ty, { toValue: -80, duration: motion.duration.fast, useNativeDriver: true }).start(onHide);
      }, durationMs);
      return () => clearTimeout(t);
    }
  }, [visible, ty, onHide, durationMs]);

  if (!visible) return null;
  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY: ty }], backgroundColor: variant === 'warm' ? color.accent.warm : color.text.primary }]}>
      <Text style={{ color: color.text.onPrimary }}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: space[6], paddingHorizontal: space[4], paddingBottom: space[3],
    borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg,
    zIndex: 100,
  },
});
