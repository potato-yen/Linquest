import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { space } from '../tokens';

export function ScoreCard({ label, value, variant = 'compact' }: { label: string; value: string | number; variant?: 'compact' | 'hero' }) {
  const numValue = typeof value === 'number' ? value : null;
  const [displayed, setDisplayed] = useState<string | number>(numValue ?? value);
  const prevRef = useRef<number | null>(numValue);

  useEffect(() => {
    if (numValue === null) { setDisplayed(value); return; }
    const from = prevRef.current ?? numValue;
    prevRef.current = numValue;
    if (from === numValue) return;

    const steps = 20;
    const duration = 800;
    const stepMs = duration / steps;
    let step = 0;
    const id = setInterval(() => {
      step++;
      const t = step / steps;
      setDisplayed(Math.round(from + (numValue - from) * t));
      if (step >= steps) clearInterval(id);
    }, stepMs);
    return () => clearInterval(id);
  }, [numValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ alignItems: 'center', gap: space[1] }}>
      <Text variant="caption" color="muted">{label}</Text>
      <Text variant={variant === 'hero' ? 'h1' : 'num'}>{String(displayed)}</Text>
    </View>
  );
}
