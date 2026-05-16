// lib/ui/components/QuestionCard.tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { space } from '../tokens';

export function QuestionCard({ prompt, ipa }: { prompt: string; ipa?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: space[2], marginVertical: space[5] }}>
      <Text variant="caption" color="muted">本題</Text>
      <Text variant="h1" style={{ textAlign: 'center' }}>{prompt}</Text>
      {ipa ? <Text variant="caption" color="muted">{ipa}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[1], opacity: 0.4 }}>
        <Icon name="volume-2" size={16} />
        <Text variant="caption" color="muted">播放（v2）</Text>
      </View>
    </View>
  );
}
