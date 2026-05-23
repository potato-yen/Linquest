import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { color, radius, shadow, space } from '../tokens';
import { Question } from '../../answering/types';

export interface FlashCardProps {
  question: Question;
  isCorrect?: boolean;
  showBoth?: boolean;
}

function getResultLabel(isCorrect?: boolean): string {
  if (isCorrect === true) return '答對了';
  if (isCorrect === false) return '再看一次';
  return '單字預覽';
}

function getResultColor(isCorrect?: boolean): string {
  if (isCorrect === true) return '#D4AC4A';
  if (isCorrect === false) return color.accent.warm;
  return color.brand.primary;
}

export function FlashCard({ question, isCorrect, showBoth }: FlashCardProps) {
  const accentColor = getResultColor(showBoth ? undefined : isCorrect);
  const exampleSentence = question.meta?.example_sentence;
  const exampleTranslation = question.meta?.example_translation;
  const ipa = question.meta?.ipa;

  return (
    <View style={[styles.card, { borderColor: accentColor }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: accentColor }]}>
          <Icon name="check" size={16} color={color.text.onPrimary} />
        </View>
        <Text variant="caption" color="muted">{getResultLabel(showBoth ? undefined : isCorrect)}</Text>
      </View>

      <View style={styles.wordBlock}>
        <Text variant="h2" style={styles.answer}>{question.correct_answer}</Text>
        {ipa ? <Text variant="caption" color="muted" style={styles.ipa}>{ipa}</Text> : null}
        {showBoth && (
          <Text variant="h3" color="secondary" style={styles.prompt}>{question.prompt}</Text>
        )}
      </View>

      {exampleSentence ? (
        <View style={styles.example}>
          <Text variant="caption" color="muted">例句</Text>
          <Text variant="body">{exampleSentence}</Text>
          {exampleTranslation ? (
            <Text variant="label" color="secondary">{exampleTranslation}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.example}>
          <Text variant="caption" color="muted">意思</Text>
          <Text variant="body">{question.prompt}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.bg.surface,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: space[4],
    gap: space[3],
    ...shadow.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordBlock: {
    gap: space[1],
  },
  answer: {
    textAlign: 'left',
  },
  ipa: {
    fontStyle: 'italic',
    textTransform: 'none',
    letterSpacing: 0,
  },
  prompt: {
    fontStyle: 'italic',
  },
  example: {
    borderTopWidth: 1,
    borderTopColor: color.bg.sunken,
    paddingTop: space[3],
    gap: space[1],
  },
});
