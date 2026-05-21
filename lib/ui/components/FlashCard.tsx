// lib/ui/components/FlashCard.tsx
// Spec §11 #1 — flash card behaviour TBD pending user discussion with classmate.
// This strawman renders meta.example_sentence + IPA + translation if present.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { color, radius, space } from '../tokens';
import { Question } from '../../answering/types';

export function FlashCard({ question, isCorrect, showBoth }: { question: Question; isCorrect?: boolean; showBoth?: boolean }) {
  const borderColor = showBoth ? color.brand.primary : (isCorrect ? '#D4AC4A' : color.accent.warm);
  return (
    <View style={[styles.card, { borderColor }]}>
      <Text variant="caption" color="muted">FLASH CARD</Text>
      
      <View style={{ marginTop: space[1], gap: space[2] }}>
        <Text variant="h2">{question.correct_answer}</Text>
        {showBoth && (
          <Text variant="h3" color="secondary" style={{ fontStyle: 'italic' }}>{question.prompt}</Text>
        )}
      </View>

      {question.meta?.ipa ? <Text variant="caption" color="muted" style={{ fontStyle: 'italic' }}>{question.meta.ipa}</Text> : null}
      {question.meta?.example_sentence ? (
        <Text variant="body" style={{ marginTop: space[2] }}>{question.meta.example_sentence}</Text>
      ) : null}
      {question.meta?.example_translation ? (
        <Text variant="caption" color="secondary" style={{ marginTop: space[1] }}>{question.meta.example_translation}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bg.surface,
    borderWidth: 1.5, borderRadius: radius.lg,
    padding: space[4], gap: space[1],
  },
});
