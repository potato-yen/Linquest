import { AxialCoord } from './types';

const DIRECTIONS: AxialCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function neighbors(coord: AxialCoord): AxialCoord[] {
  return DIRECTIONS.map((direction) => ({
    q: coord.q + direction.q,
    r: coord.r + direction.r,
  }));
}

export function distance(a: AxialCoord, b: AxialCoord): number {
  const ax = a.q;
  const az = a.r;
  const ay = -ax - az;
  const bx = b.q;
  const bz = b.r;
  const by = -bx - bz;

  return Math.max(
    Math.abs(ax - bx),
    Math.abs(ay - by),
    Math.abs(az - bz),
  );
}

export function isAdjacent(a: AxialCoord, b: AxialCoord): boolean {
  return distance(a, b) === 1;
}

export function axialToString(coord: AxialCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseAxial(serialized: string): AxialCoord {
  const [q, r] = serialized.split(',').map(Number);

  return { q, r };
}

export function bfsFrom(
  start: AxialCoord,
  count: number,
  isAvailable: (coord: AxialCoord) => boolean,
): AxialCoord[] {
  const queue: AxialCoord[] = [start];
  const visited = new Set<string>();
  const out: AxialCoord[] = [];

  while (queue.length > 0 && out.length < count) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    const key = axialToString(current);
    if (visited.has(key)) {
      continue;
    }

    visited.add(key);
    if (!isAvailable(current)) {
      continue;
    }

    out.push(current);
    queue.push(...neighbors(current));
  }

  return out;
}
