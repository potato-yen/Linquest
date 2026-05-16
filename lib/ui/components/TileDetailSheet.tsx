// lib/ui/components/TileDetailSheet.tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Badge } from './Badge';
import { space } from '../tokens';
import type { TileRender } from '../../territory-ui/tile-state';

export function TileDetailSheet({
  render: r, ownerName, ownerColor, costLabel, rewardLabel, attackable, onAttack, specialDisabled,
}: {
  render: TileRender;
  ownerName?: string;
  ownerColor?: string;
  costLabel: string;
  rewardLabel: string;
  attackable: boolean;
  onAttack: () => void;
  specialDisabled?: boolean;
}) {
  const kindLabel = r.isSpecial ? '特殊格' : r.isMultiplier ? `倍率格 ×${r.multiplier ?? '?'}` : r.isCapital ? '首都' : '一般格';
  return (
    <View style={{ padding: space[5], gap: space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Text variant="h2">{kindLabel}</Text>
        {r.isCooldown ? <Badge variant="warm">cooldown</Badge> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
        {ownerColor ? <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: ownerColor }} /> : null}
        <Text color="muted">{ownerName ?? '中立未開拓'}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: space[5], marginTop: space[3] }}>
        <View><Text variant="caption" color="muted">cost</Text><Text variant="num">{costLabel}</Text></View>
        <View><Text variant="caption" color="muted">reward</Text><Text variant="num">{rewardLabel}</Text></View>
      </View>

      {specialDisabled ? (
        <Text color="muted" style={{ marginTop: space[3] }}>特殊格 1v1 對戰將在 Phase 3 開放。</Text>
      ) : (
        <Button title="攻擊" onPress={onAttack} disabled={!attackable || r.isCooldown} />
      )}
    </View>
  );
}
