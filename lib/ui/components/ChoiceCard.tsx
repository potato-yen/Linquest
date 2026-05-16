// lib/ui/components/ChoiceCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { color, radius, space } from '../tokens';

export type ChoiceState = 'idle' | 'pressed' | 'correct' | 'incorrect';

const STATE_STYLES = {
  idle:      { bg: color.bg.surface, border: color.bg.sunken },
  pressed:   { bg: color.bg.muted,   border: color.brand.primary },
  correct:   { bg: '#D4E0C0',        border: color.brand.primary },
  incorrect: { bg: '#EFD9C8',        border: color.accent.warm },
};

export function ChoiceCard({
  pick, choice, state, onPress,
}: { pick: 'A' | 'B' | 'C' | 'D'; choice: string; state: ChoiceState; onPress: () => void }) {
  const s = STATE_STYLES[state];
  const locked = state === 'correct' || state === 'incorrect';
  const handlePress = () => { if (!locked) onPress(); };
  return (
    <Pressable onPress={handlePress} style={[styles.card, { backgroundColor: s.bg, borderColor: s.border }]}>
      <View style={styles.row}>
        <Text variant="caption" color="muted" style={{ marginRight: space[3] }}>{pick}</Text>
        <Text variant="h3" style={{ flex: 1 }}>{choice}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1, borderRadius: radius.md,
    paddingVertical: space[3], paddingHorizontal: space[4],
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});
