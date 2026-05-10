import { TerritoryError } from './errors';
import { ChallengeKind, ChallengeSpec, HexTile, TerritoryParams } from './types';

export interface ChallengeOutcome {
  successReward: number;
  additionalFailAttackerDelta: number;
  failDefenderDelta: number;
}

export function resolveChallengeSpec(
  tile: HexTile,
  requestorGroupId: string,
  params: TerritoryParams,
): ChallengeSpec {
  const kind = deriveChallengeKind(tile, requestorGroupId);
  const cost = deriveChallengeCost(tile, kind, params);
  const outcome = deriveChallengeOutcome(kind, cost, params);

  if (kind === 'capture_special') {
    return {
      kind,
      question_count: 0,
      difficulty: 'standard',
      cost,
      success_reward: outcome.successReward,
      fail_attacker_delta: -cost,
      fail_defender_delta: outcome.failDefenderDelta,
      applies_cooldown_on_success: false,
      applies_cooldown_on_fail: false,
    };
  }

  if (kind === 'capture_multiplier' || kind === 'reverse_multiplier' || kind === 'self_recapture_multiplier') {
    const multiplier = tile.multiplier as 2 | 3;
    const questionCount = kind === 'capture_multiplier'
      ? (multiplier === 2 ? 10 : 15)
      : kind === 'reverse_multiplier'
        ? (multiplier === 2 ? 14 : 18)
        : (multiplier - 1) * 5;

    return {
      kind,
      question_count: questionCount,
      difficulty: 'advanced',
      cost,
      success_reward: outcome.successReward,
      fail_attacker_delta: kind === 'reverse_multiplier'
        ? -Math.round(cost * params.reverse_attack_fail_factor)
        : -cost,
      fail_defender_delta: outcome.failDefenderDelta,
      applies_cooldown_on_success: true,
      applies_cooldown_on_fail: kind === 'reverse_multiplier',
    };
  }

  return {
    kind,
    question_count: kind === 'capture_normal' ? 5 : 7,
    difficulty: 'standard',
    cost,
    success_reward: outcome.successReward,
    fail_attacker_delta: kind === 'reverse_normal'
      ? -Math.round(cost * params.reverse_attack_fail_factor)
      : -cost,
    fail_defender_delta: outcome.failDefenderDelta,
    applies_cooldown_on_success: true,
    applies_cooldown_on_fail: kind === 'reverse_normal',
  };
}

export function deriveChallengeKind(
  tile: HexTile,
  requestorGroupId: string,
): ChallengeKind {
  if (tile.kind === 'special') {
    if (tile.owner_group_id !== null) {
      throw new TerritoryError('PROTECTED', 'special tile already captured');
    }

    return 'capture_special';
  }

  if (tile.kind === 'multiplier') {
    if (tile.owner_group_id === null) {
      return 'capture_multiplier';
    }

    if (tile.owner_group_id === requestorGroupId) {
      return 'self_recapture_multiplier';
    }

    return 'reverse_multiplier';
  }

  if (tile.owner_group_id === null) {
    return 'capture_normal';
  }

  if (tile.owner_group_id === requestorGroupId) {
    throw new TerritoryError('NOT_ADJACENT', 'cannot capture own normal tile');
  }

  return 'reverse_normal';
}

export function deriveChallengeCost(
  tile: HexTile,
  kind: ChallengeKind,
  params: TerritoryParams,
): number {
  if (kind === 'capture_special') {
    return params.cost_special;
  }

  if (kind === 'self_recapture_multiplier') {
    const multiplier = tile.multiplier as 2 | 3;
    return (multiplier - 1) * params.cost_normal;
  }

  if (kind === 'capture_multiplier' || kind === 'reverse_multiplier') {
    return tile.multiplier === 3 ? params.cost_3x : params.cost_2x;
  }

  return params.cost_normal;
}

export function deriveChallengeOutcome(
  kind: ChallengeKind,
  cost: number,
  params: TerritoryParams,
): ChallengeOutcome {
  if (kind === 'reverse_normal' || kind === 'reverse_multiplier') {
    return {
      successReward: Math.round(cost * params.roi_factor * params.reverse_attack_reward_factor),
      additionalFailAttackerDelta: -Math.round(cost * (params.reverse_attack_fail_factor - 1)),
      failDefenderDelta: Math.round(cost * (params.reverse_attack_fail_factor - 1)),
    };
  }

  if (kind === 'capture_special') {
    return {
      successReward: cost,
      additionalFailAttackerDelta: 0,
      failDefenderDelta: 0,
    };
  }

  return {
    successReward: Math.round(cost * params.roi_factor),
    additionalFailAttackerDelta: 0,
    failDefenderDelta: 0,
  };
}
