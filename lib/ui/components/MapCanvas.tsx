import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { HexTile } from './HexTile';
import { axialToPixel, HEX_SIZE } from '../../territory-ui/map-projection';
import { computeTileRender } from '../../territory-ui/tile-state';
import { color } from '../tokens';
import type { HexTile as HexTileRow } from '../../territory/types';
import { TerritoryBg } from '../illustrations/scenes';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface MapCanvasProps {
  tiles: HexTileRow[];
  groups: { id: string; color: string }[];
  myGroupId: string | null;
  width: number;
  height: number;
  onTilePress?: (tileId: string) => void;
}

interface Ripple {
  key: number;
  cx: number;
  cy: number;
  anim: Animated.Value;
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

  const prevSelfIds = useRef<Set<string>>(new Set());
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleKeyRef = useRef(0);

  useEffect(() => {
    const nowSelfIds = new Set(
      tiles.filter((t) => t.owner_group_id === myGroupId).map((t) => t.id)
    );

    const newSelf = tiles
      .filter((t) => t.owner_group_id === myGroupId && !prevSelfIds.current.has(t.id))
      .map((t) => {
        const p = axialToPixel(t.q, t.r);
        const allP = tiles.map((tt) => axialToPixel(tt.q, tt.r));
        const mX = Math.min(...allP.map((pp) => pp.x), 0);
        const mY = Math.min(...allP.map((pp) => pp.y), 0);
        const pad = 30;
        const ox = pad - mX;
        const oy = pad - mY;
        const anim = new Animated.Value(0);
        const key = ++rippleKeyRef.current;
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: false }).start(() => {
          setRipples((rs) => rs.filter((r) => r.key !== key));
        });
        return { key, cx: p.x + ox, cy: p.y + oy, anim };
      });

    if (newSelf.length > 0) setRipples((rs) => [...rs, ...newSelf]);
    prevSelfIds.current = nowSelfIds;
  }, [tiles, myGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ width, height, backgroundColor: color.bg.muted, borderRadius: 12, overflow: 'hidden' }}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}
      >
        <TerritoryBg size={Math.max(width, height)} />
      </View>
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
        {ripples.map((rp) => (
          <AnimatedCircle
            key={rp.key}
            cx={rp.cx}
            cy={rp.cy}
            r={rp.anim.interpolate({ inputRange: [0, 1], outputRange: [0, HEX_SIZE] })}
            stroke="#FAF6EE"
            strokeWidth={2}
            fill="none"
            strokeOpacity={rp.anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })}
          />
        ))}
      </Svg>
    </View>
  );
}
