// lib/ui/components/EmptyState.tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { space } from '../tokens';
import type { Illustration } from '../illustrations';

export interface EmptyStateProps {
  illustration?: Illustration | null;
  title: string;
  body?: string;
  ctaTitle?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ illustration: Ill, title, body, ctaTitle, onCtaPress }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space[7], gap: space[3] }}>
      {Ill ? (
        <View style={{ opacity: 0.9, marginBottom: space[2] }}>
          <Ill size={148} />
        </View>
      ) : null}
      <Text variant="h3">{title}</Text>
      {body ? <Text variant="body" color="muted" style={{ textAlign: 'center', paddingHorizontal: space[4] }}>{body}</Text> : null}
      {ctaTitle && onCtaPress ? <Button title={ctaTitle} onPress={onCtaPress} /> : null}
    </View>
  );
}
