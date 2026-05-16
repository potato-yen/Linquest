import type { HexTile } from '../territory/types';

export type Ownership = 'neutral' | 'self' | 'other';

export interface TileRender {
  ownership: Ownership;
  isCapital: boolean;
  isMultiplier: boolean;
  multiplier: 2 | 3 | null;
  isSpecial: boolean;
  isCooldown: boolean;
  hasActiveChallenge: boolean;
  ownerGroupId: string | null;
}

export function computeTileRender(t: HexTile, ctx: { myGroupId: string | null; now: Date }): TileRender {
  const ownership: Ownership = !t.owner_group_id ? 'neutral'
    : t.owner_group_id === ctx.myGroupId ? 'self' : 'other';
  const isCooldown = !!t.protected_until && new Date(t.protected_until) > ctx.now;
  return {
    ownership,
    isCapital: t.is_capital,
    isMultiplier: t.kind === 'multiplier',
    multiplier: t.multiplier,
    isSpecial: t.kind === 'special',
    isCooldown,
    hasActiveChallenge: !!t.active_challenge_id,
    ownerGroupId: t.owner_group_id,
  };
}
