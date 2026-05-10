import { AxialCoord } from './types';
import { distance } from './coords';
function cumulativeCount(radius: number): number {
  return 3 * radius * (radius + 1) + 1;
}

function allCoordsWithinRadius(radius: number): AxialCoord[] {
  const coords: AxialCoord[] = [];

  for (let q = -radius; q <= radius; q += 1) {
    const minR = Math.max(-radius, -q - radius);
    const maxR = Math.min(radius, -q + radius);

    for (let r = minR; r <= maxR; r += 1) {
      coords.push({ q, r });
    }
  }

  return coords;
}

export function generateShape(targetSize: number): AxialCoord[] {
  if (targetSize < 1) {
    return [];
  }

  let radius = 0;
  while (cumulativeCount(radius) < targetSize) {
    radius += 1;
  }

  if (radius === 0) {
    return [{ q: 0, r: 0 }];
  }

  const fullShape = allCoordsWithinRadius(radius);

  return fullShape.slice(0, targetSize);
}

export function mapDiameter(tiles: AxialCoord[]): number {
  let maxDistance = 0;

  for (let left = 0; left < tiles.length; left += 1) {
    for (let right = left + 1; right < tiles.length; right += 1) {
      maxDistance = Math.max(maxDistance, distance(tiles[left], tiles[right]));
    }
  }

  return maxDistance;
}
