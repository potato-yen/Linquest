import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Animated } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Reanimated, {
  useSharedValue, useAnimatedStyle, useAnimatedProps, withDecay, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Pattern, Line } from 'react-native-svg';
import { HexTile } from './HexTile';
import { axialToPixel, HEX_SIZE } from '../../territory-ui/map-projection';
import { computeTileRender } from '../../territory-ui/tile-state';
import { color, tile as tileTok } from '../tokens';
import type { HexTile as HexTileRow } from '../../territory/types';
import { TerritoryBg } from '../illustrations/scenes';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPattern = Reanimated.createAnimatedComponent(Pattern);
const STRIPE_W = 6; // px; one cooldown-stripe period

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

interface Glow {
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
  const prevWave = useRef<Map<string, string | null> | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [glows, setGlows] = useState<Glow[]>([]);
  const fxKeyRef = useRef(0);

  useEffect(() => {
    const allP = tiles.map((tt) => axialToPixel(tt.q, tt.r));
    const pad = 30;
    const ox = pad - Math.min(...allP.map((pp) => pp.x), 0);
    const oy = pad - Math.min(...allP.map((pp) => pp.y), 0);

    // Claim ripple — newly self-owned tiles.
    const nowSelfIds = new Set(
      tiles.filter((t) => t.owner_group_id === myGroupId).map((t) => t.id)
    );
    const newSelf = tiles
      .filter((t) => t.owner_group_id === myGroupId && !prevSelfIds.current.has(t.id))
      .map((t) => {
        const p = axialToPixel(t.q, t.r);
        const anim = new Animated.Value(0);
        const key = ++fxKeyRef.current;
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: false }).start(() => {
          setRipples((rs) => rs.filter((r) => r.key !== key));
        });
        return { key, cx: p.x + ox, cy: p.y + oy, anim };
      });
    if (newSelf.length > 0) setRipples((rs) => [...rs, ...newSelf]);
    prevSelfIds.current = nowSelfIds;

    // Refresh-wave glow — tiles whose last_refresh_wave_id changed (spec §7
    // hex.refreshGlow). Skip the first load (prevWave null) so we don't flash
    // the whole board on mount.
    if (prevWave.current !== null) {
      const prev = prevWave.current;
      const newGlows = tiles
        .filter((t) => prev.has(t.id) && prev.get(t.id) !== t.last_refresh_wave_id && t.last_refresh_wave_id != null)
        .map((t) => {
          const p = axialToPixel(t.q, t.r);
          const anim = new Animated.Value(0);
          const key = ++fxKeyRef.current;
          Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: false }).start(() => {
            setGlows((gs) => gs.filter((g) => g.key !== key));
          });
          return { key, cx: p.x + ox, cy: p.y + oy, anim };
        });
      if (newGlows.length > 0) setGlows((gs) => [...gs, ...newGlows]);
    }
    prevWave.current = new Map(tiles.map((t) => [t.id, t.last_refresh_wave_id]));
  }, [tiles, myGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // One shared driver shifts the diagonal cooldown hatch ~1px/s (spec §7
  // hex.cooldownStripe). All cooldown hexes reference the same <Pattern>.
  const stripeShift = useSharedValue(0);
  useEffect(() => {
    stripeShift.value = withRepeat(
      withTiming(STRIPE_W, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [stripeShift]);
  const stripeProps = useAnimatedProps(() => ({
    patternTransform: `rotate(45) translate(${stripeShift.value} 0)`,
  }));

  // Pinch + pan with ~300ms inertia decay (spec §7 map.panZoom). Hex taps
  // survive because Pan needs minDistance movement and Pinch needs 2 fingers.
  const scale = useSharedValue(1);
  const baseScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart(() => { baseScale.value = scale.value; })
    .onUpdate((e) => {
      scale.value = Math.max(0.6, Math.min(2.4, baseScale.value * e.scale));
    });
  const pan = Gesture.Pan()
    .minDistance(8)
    .onChange((e) => { tx.value += e.changeX; ty.value += e.changeY; })
    .onEnd((e) => {
      tx.value = withDecay({ velocity: e.velocityX, deceleration: 0.992, clamp: [-width, width] });
      ty.value = withDecay({ velocity: e.velocityY, deceleration: 0.992, clamp: [-height, height] });
    });
  const mapGesture = Gesture.Simultaneous(pinch, pan);
  const mapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <View style={{ width, height, backgroundColor: color.bg.muted, borderRadius: 12, overflow: 'hidden' }}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}
      >
        <TerritoryBg size={Math.max(width, height)} />
      </View>
      <GestureDetector gesture={mapGesture}>
       <Reanimated.View style={[{ width, height }, mapStyle]}>
      <Svg width={width} height={height} viewBox={`0 0 ${vbW} ${vbH}`}>
        <Defs>
          <AnimatedPattern
            id="cooldown-stripes"
            patternUnits="userSpaceOnUse"
            width={STRIPE_W}
            height={STRIPE_W}
            animatedProps={stripeProps}
          >
            <Line
              x1={0} y1={0} x2={0} y2={STRIPE_W}
              stroke={tileTok.cooldownMask.color}
              strokeWidth={2}
              strokeOpacity={0.35}
            />
          </AnimatedPattern>
        </Defs>
        {positioned.map(({ tile, p }) => {
          const r = computeTileRender(tile, { myGroupId, now });
          return (
            <HexTile
              key={tile.id}
              tileId={tile.id}
              cx={p.x + offsetX}
              cy={p.y + offsetY}
              render={r}
              groupColor={r.ownerGroupId ? groupColorById[r.ownerGroupId] ?? null : null}
              onPress={onTilePress}
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
        {/* Refresh-wave glow: 3 stacked circles fake a soft blur — works on
            Android where the SVG blur filter is unreliable. */}
        {glows.map((g) =>
          [
            { r: HEX_SIZE * 0.7, o: 0.55 },
            { r: HEX_SIZE * 0.9, o: 0.32 },
            { r: HEX_SIZE * 1.1, o: 0.16 },
          ].map((ring, i) => (
            <AnimatedCircle
              key={`${g.key}-${i}`}
              cx={g.cx}
              cy={g.cy}
              r={ring.r}
              fill={tileTok.refreshGlow.color}
              fillOpacity={g.anim.interpolate({ inputRange: [0, 1], outputRange: [ring.o, 0] })}
            />
          )),
        )}
      </Svg>
       </Reanimated.View>
      </GestureDetector>
    </View>
  );
}
