// lib/ui/components/EmptyState.tsx
import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { space } from '../tokens';

export interface EmptyStateProps {
  illustration?: ImageSourcePropType | null;
  title: string;
  body?: string;
  ctaTitle?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ illustration, title, body, ctaTitle, onCtaPress }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space[7], gap: space[3] }}>
      {illustration ? <Image source={illustration} style={{ width: 160, height: 120, opacity: 0.85 }} resizeMode="contain" /> : null}
      <Text variant="h3">{title}</Text>
      {body ? <Text variant="body" color="muted" style={{ textAlign: 'center', paddingHorizontal: space[4] }}>{body}</Text> : null}
      {ctaTitle && onCtaPress ? <Button title={ctaTitle} onPress={onCtaPress} /> : null}
    </View>
  );
}
