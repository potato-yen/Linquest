import React from 'react';
import { Polygon, G, Text as SvgText, Circle } from 'react-native-svg';
import { hexVertices, HEX_SIZE } from '../../territory-ui/map-projection';
import { color, tile as tileTok } from '../tokens';
import type { TileRender } from '../../territory-ui/tile-state';

export interface HexTileProps {
  cx: number;
  cy: number;
  tileId: string;
  render: TileRender;
  groupColor: string | null;
  onPress?: (tileId: string) => void;
}

function HexTileImpl({ cx, cy, tileId, render: r, groupColor, onPress }: HexTileProps) {
  const verts = hexVertices(cx, cy);

  let fill: string = tileTok.neutral.fill;
  let alpha: number = tileTok.neutral.alpha;
  let stroke: string = tileTok.neutral.stroke;
  let strokeW: number = tileTok.neutral.strokeW;
  let strokeDash: string | undefined = tileTok.neutral.dashed ? '2 2' : undefined;

  if (r.ownership === 'self' && groupColor) {
    fill = groupColor;
    alpha = r.isCapital ? tileTok.capitalEdge.alpha : tileTok.ownedSelf.alpha;
    stroke = tileTok.ownedSelf.stroke;
    strokeW = r.isCapital ? tileTok.capitalEdge.strokeW : tileTok.ownedSelf.strokeW;
    strokeDash = undefined;
  } else if (r.ownership === 'other' && groupColor) {
    fill = groupColor;
    alpha = tileTok.ownedOther.alpha;
    stroke = groupColor;
    strokeW = tileTok.ownedOther.strokeW;
    strokeDash = undefined;
  }

  const overrideStroke = r.isMultiplier;
  const finalStroke = overrideStroke ? tileTok.multiplierEdge.stroke : stroke;
  const finalStrokeW = overrideStroke ? tileTok.multiplierEdge.strokeW : strokeW;

  return (
    <G>
      <Polygon
        points={verts}
        fill={fill}
        fillOpacity={alpha}
        stroke={finalStroke}
        strokeWidth={finalStrokeW}
        strokeDasharray={strokeDash}
        onPress={onPress ? () => onPress(tileId) : undefined}
      />
      {r.isCooldown ? (
        <G pointerEvents="none">
          <Polygon points={verts} fill={tileTok.cooldownMask.color} fillOpacity={tileTok.cooldownMask.alpha} />
          <Polygon points={verts} fill="url(#cooldown-stripes)" />
        </G>
      ) : null}
      {r.isCapital ? (
        <SvgText x={cx} y={cy + 4} fontSize="11" fill={color.text.onPrimary} textAnchor="middle" pointerEvents="none">★</SvgText>
      ) : null}
      {r.isMultiplier && r.multiplier ? (
        <SvgText x={cx} y={cy + 4} fontSize="9" fill={color.text.primary} textAnchor="middle" pointerEvents="none">×{r.multiplier}</SvgText>
      ) : null}
      {r.isSpecial ? (
        <G pointerEvents="none">
          <Polygon points={`${cx},${cy - 8} ${cx + 7},${cy - 5} ${cx},${cy - 2}`} fill={tileTok.specialBadge.color} />
        </G>
      ) : null}
      {r.hasActiveChallenge ? (
        <Circle cx={cx} cy={cy + HEX_SIZE / 2 + 2} r={2} fill="#D4AC4A" pointerEvents="none" />
      ) : null}
    </G>
  );
}

// Polled territory data re-renders every tile each tick / during data refresh.
// Memoize on the visual inputs only (onPress identity is intentionally
// ignored — behaviour is stable per tileId) so a single tile change doesn't
// re-render the whole 80-tile board. See lib/ui/perf/runtime-budget.md.
function tileEqual(a: HexTileProps, b: HexTileProps): boolean {
  if (a.cx !== b.cx || a.cy !== b.cy || a.tileId !== b.tileId || a.groupColor !== b.groupColor) return false;
  const x = a.render, y = b.render;
  return (
    x.ownership === y.ownership &&
    x.isCapital === y.isCapital &&
    x.isMultiplier === y.isMultiplier &&
    x.multiplier === y.multiplier &&
    x.isSpecial === y.isSpecial &&
    x.isCooldown === y.isCooldown &&
    x.hasActiveChallenge === y.hasActiveChallenge &&
    x.ownerGroupId === y.ownerGroupId
  );
}

export const HexTile = React.memo(HexTileImpl, tileEqual);
