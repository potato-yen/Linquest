import React from 'react';
import { Polygon, G, Text as SvgText, Circle } from 'react-native-svg';
import { hexVertices, HEX_SIZE } from '../../territory-ui/map-projection';
import { color, tile as tileTok } from '../tokens';
import type { TileRender } from '../../territory-ui/tile-state';

export interface HexTileProps {
  cx: number;
  cy: number;
  render: TileRender;
  groupColor: string | null;
  onPress?: () => void;
}

export function HexTile({ cx, cy, render: r, groupColor, onPress }: HexTileProps) {
  const verts = hexVertices(cx, cy);

  let fill = tileTok.neutral.fill;
  let alpha = tileTok.neutral.alpha;
  let stroke = tileTok.neutral.stroke;
  let strokeW = tileTok.neutral.strokeW;
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
        onPress={onPress}
      />
      {r.isCapital ? (
        <SvgText x={cx} y={cy + 4} fontSize="11" fill={color.text.onPrimary} textAnchor="middle">★</SvgText>
      ) : null}
      {r.isMultiplier && r.multiplier ? (
        <SvgText x={cx} y={cy + 4} fontSize="9" fill={color.text.primary} textAnchor="middle">×{r.multiplier}</SvgText>
      ) : null}
      {r.isSpecial ? (
        <G>
          <Polygon points={`${cx},${cy - 8} ${cx + 7},${cy - 5} ${cx},${cy - 2}`} fill={tileTok.specialBadge.color} />
        </G>
      ) : null}
      {r.hasActiveChallenge ? (
        <Circle cx={cx} cy={cy + HEX_SIZE / 2 + 2} r={2} fill="#D4AC4A" />
      ) : null}
    </G>
  );
}
