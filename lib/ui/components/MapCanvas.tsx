import React, { useMemo } from 'react';
import { View, Image } from 'react-native';
import Svg from 'react-native-svg';
import { HexTile } from './HexTile';
import { axialToPixel } from '../../territory-ui/map-projection';
import { computeTileRender } from '../../territory-ui/tile-state';
import { color } from '../tokens';
import type { HexTile as HexTileRow } from '../../territory/types';
import { illustrations } from '../illustrations';

export interface MapCanvasProps {
  tiles: HexTileRow[];
  groups: { id: string; color: string }[];
  myGroupId: string | null;
  width: number;
  height: number;
  onTilePress?: (tileId: string) => void;
}

export function MapCanvas({ tiles, groups, myGroupId, width, height, onTilePress }: MapCanvasProps) {
  const groupColorById = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g.color])), [groups]);
  const now = useMemo(() => new Date(), [tiles]);

  const positioned = useMemo(() => tiles.map((t) => ({ tile: t, p: axialToPixel(t.q, t.r) })), [tiles]);
  const minX = Math.min(...positioned.map((x) => x.p.x), 0);
  const maxX = Math.max(...positioned.map((x) => x.p.x), 0);
  const minY = Math.min(...positioned.map((x) => x.p.y), 0);
  const maxY = Math.max(...positioned.map((x) => x.p.y), 0);
  const padding = 30;
  const vbW = (maxX - minX) + padding * 2;
  const vbH = (maxY - minY) + padding * 2;
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  return (
    <View style={{ width, height, backgroundColor: color.bg.muted, borderRadius: 12, overflow: 'hidden' }}>
      {illustrations.map.territoryBg ? (
        <Image source={illustrations.map.territoryBg} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.7 }} resizeMode="cover" />
      ) : null}
      <Svg width={width} height={height} viewBox={`0 0 ${vbW} ${vbH}`}>
        {positioned.map(({ tile, p }) => {
          const r = computeTileRender(tile, { myGroupId, now });
          return (
            <HexTile
              key={tile.id}
              cx={p.x + offsetX}
              cy={p.y + offsetY}
              render={r}
              groupColor={r.ownerGroupId ? groupColorById[r.ownerGroupId] ?? null : null}
              onPress={() => onTilePress?.(tile.id)}
            />
          );
        })}
      </Svg>
    </View>
  );
}
