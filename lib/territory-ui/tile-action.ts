export type TileActionDisabledReason =
  | 'ended'
  | 'locked'
  | 'cooldown'
  | 'not_adjacent'
  | 'insufficient_treasury';

export interface TileActionState {
  canAttack: boolean;
  disabledReason: TileActionDisabledReason | null;
}

export function getTileActionState(input: {
  isEnded: boolean;
  isCooldown: boolean;
  hasActiveChallenge: boolean;
  attackableByAdjacency: boolean;
  treasury: number | null | undefined;
  cost: number | null | undefined;
}): TileActionState {
  if (input.isEnded) return { canAttack: false, disabledReason: 'ended' };
  if (input.hasActiveChallenge) return { canAttack: false, disabledReason: 'locked' };
  if (input.isCooldown) return { canAttack: false, disabledReason: 'cooldown' };
  if (!input.attackableByAdjacency) return { canAttack: false, disabledReason: 'not_adjacent' };
  if (
    typeof input.cost === 'number' &&
    typeof input.treasury === 'number' &&
    input.treasury < input.cost
  ) {
    return { canAttack: false, disabledReason: 'insufficient_treasury' };
  }

  return { canAttack: true, disabledReason: null };
}
