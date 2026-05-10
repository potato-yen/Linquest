import { TerritoryError } from './errors';
import { ChallengeSpec, HexTile, TerritoryParams } from './types';

export function resolveChallengeSpec(
  tile: HexTile,
  requestorGroupId: string,
  params: TerritoryParams,
): ChallengeSpec {
  if (tile.kind === 'special') {
    if (tile.owner_group_id !== null) {
      throw new TerritoryError('PROTECTED', 'special tile already captured');
    }

    return {
      kind: 'capture_special',
      question_count: 0,
      difficulty: 'standard',
      cost: params.cost_special,
      success_reward: params.cost_special,
      fail_attacker_delta: -params.cost_special,
      fail_defender_delta: 0,
      applies_cooldown_on_success: false,
      applies_cooldown_on_fail: false,
    };
  }

  if (tile.kind === 'multiplier') {
    const multiplier = tile.multiplier as 2 | 3;
    const baseCost = multiplier === 2 ? params.cost_2x : params.cost_3x;

    if (tile.owner_group_id === null) {
      return {
        kind: 'capture_multiplier',
        question_count: multiplier === 2 ? 10 : 15,
        difficulty: 'advanced',
        cost: baseCost,
        success_reward: Math.round(baseCost * params.roi_factor),
        fail_attacker_delta: -baseCost,
        fail_defender_delta: 0,
        applies_cooldown_on_success: true,
        applies_cooldown_on_fail: false,
      };
    }

    if (tile.owner_group_id === requestorGroupId) {
      const selfCost = (multiplier - 1) * params.cost_normal;

      return {
        kind: 'self_recapture_multiplier',
        question_count: (multiplier - 1) * 5,
        difficulty: 'advanced',
        cost: selfCost,
        success_reward: Math.round(selfCost * params.roi_factor),
        fail_attacker_delta: -selfCost,
        fail_defender_delta: 0,
        applies_cooldown_on_success: true,
        applies_cooldown_on_fail: false,
      };
    }

    return {
      kind: 'reverse_multiplier',
      question_count: multiplier === 2 ? 14 : 18,
      difficulty: 'advanced',
      cost: baseCost,
      success_reward: Math.round(
        baseCost * params.roi_factor * params.reverse_attack_reward_factor,
      ),
      fail_attacker_delta: -Math.round(baseCost * params.reverse_attack_fail_factor),
      fail_defender_delta: Math.round(baseCost * (params.reverse_attack_fail_factor - 1)),
      applies_cooldown_on_success: true,
      applies_cooldown_on_fail: true,
    };
  }

  if (tile.owner_group_id === null) {
    return {
      kind: 'capture_normal',
      question_count: 5,
      difficulty: 'standard',
      cost: params.cost_normal,
      success_reward: Math.round(params.cost_normal * params.roi_factor),
      fail_attacker_delta: -params.cost_normal,
      fail_defender_delta: 0,
      applies_cooldown_on_success: true,
      applies_cooldown_on_fail: false,
    };
  }

  if (tile.owner_group_id === requestorGroupId) {
    throw new TerritoryError('NOT_ADJACENT', 'cannot capture own normal tile');
  }

  return {
    kind: 'reverse_normal',
    question_count: 7,
    difficulty: 'standard',
    cost: params.cost_normal,
    success_reward: Math.round(
      params.cost_normal * params.roi_factor * params.reverse_attack_reward_factor,
    ),
    fail_attacker_delta: -Math.round(params.cost_normal * params.reverse_attack_fail_factor),
    fail_defender_delta: Math.round(
      params.cost_normal * (params.reverse_attack_fail_factor - 1),
    ),
    applies_cooldown_on_success: true,
    applies_cooldown_on_fail: true,
  };
}
