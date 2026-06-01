import type { HexTile } from '../territory/types';

export type TileTimingStatus = 'locked' | 'cooldown' | null;

export interface TileTiming {
  status: TileTimingStatus;
  endsAt: string | null;
  remainingMs: number;
}

export function getTileTiming(tile: HexTile, now: Date): TileTiming {
  if (tile.active_challenge_id && tile.active_challenge_until) {
    const remainingMs = new Date(tile.active_challenge_until).getTime() - now.getTime();
    if (remainingMs > 0) {
      return {
        status: 'locked',
        endsAt: tile.active_challenge_until,
        remainingMs,
      };
    }
  }

  if (tile.protected_until) {
    const remainingMs = new Date(tile.protected_until).getTime() - now.getTime();
    if (remainingMs > 0) {
      return {
        status: 'cooldown',
        endsAt: tile.protected_until,
        remainingMs,
      };
    }
  }

  return {
    status: null,
    endsAt: null,
    remainingMs: 0,
  };
}

export function formatRemainingMs(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
