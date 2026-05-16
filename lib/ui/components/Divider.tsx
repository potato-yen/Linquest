// lib/ui/components/Divider.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { color } from '../tokens';

export function Divider({ vertical = false }: { vertical?: boolean }) {
  if (vertical) return <View style={{ width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: color.bg.sunken }} />;
  return <View style={{ height: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: color.bg.sunken }} />;
}
