// lib/ui/components/ErrorState.tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { space } from '../tokens';
import { errorIllustration } from '../illustrations';
import type { ScreenError } from '../error/mapError';

export function ErrorState({ error, onRetry }: { error: ScreenError; onRetry?: () => void }) {
  const Ill = errorIllustration(error.kind);
  return (
    <View style={{ alignItems: 'center', paddingVertical: space[7], gap: space[3] }}>
      <View style={{ opacity: 0.9, marginBottom: space[2] }}>
        <Ill size={148} />
      </View>
      <Text variant="h3" color="warm">發生錯誤</Text>
      <Text variant="body" color="muted" style={{ textAlign: 'center', paddingHorizontal: space[4] }}>{error.message}</Text>
      {onRetry ? <Button title="再試一次" variant="ghost" onPress={onRetry} /> : null}
    </View>
  );
}
