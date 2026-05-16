// lib/ui/components/ScreenScaffold.tsx
import React from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color, space } from '../tokens';

export interface ScreenScaffoldProps {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenScaffold({ children, scroll = false, contentStyle, edges = ['top', 'bottom'] }: ScreenScaffoldProps) {
  const inner = scroll
    ? <ScrollView contentContainerStyle={[{ padding: space[4], gap: space[4] }, contentStyle]}>{children}</ScrollView>
    : <View style={[{ flex: 1, padding: space[4], gap: space[4] }, contentStyle]}>{children}</View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg.base }} edges={edges as any}>
      {inner}
    </SafeAreaView>
  );
}
