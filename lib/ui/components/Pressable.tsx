// lib/ui/components/Pressable.tsx
import React, { useRef } from 'react';
import { Pressable as RNPressable, PressableProps, Animated } from 'react-native';
import { motion } from '../tokens';

export function Pressable({ children, onPressIn, onPressOut, style, ...rest }: PressableProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  return (
    <RNPressable
      {...rest}
      onPressIn={(e) => {
        Animated.timing(opacity, { toValue: 0.7, duration: 80, useNativeDriver: true }).start();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        Animated.timing(opacity, { toValue: 1, duration: motion.duration.fast, useNativeDriver: true }).start();
        onPressOut?.(e);
      }}
    >
      {(pressedState) => (
        <Animated.View style={[{ opacity }, typeof style === 'function' ? style(pressedState) : style]}>
          {typeof children === 'function' ? children(pressedState) : children}
        </Animated.View>
      )}
    </RNPressable>
  );
}
