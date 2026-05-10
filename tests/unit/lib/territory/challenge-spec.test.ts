import {
  deriveChallengeCost,
  deriveChallengeKind,
  deriveChallengeOutcome,
  resolveChallengeSpec,
} from '../../../../lib/territory/challenge-spec';
import { HexTile, TERRITORY_DEFAULTS } from '../../../../lib/territory/types';

const baseTile: HexTile = {
  id: 't1',
  map_id: 'm1',
  q: 0,
  r: 0,
  kind: 'normal',
  multiplier: null,
  owner_group_id: null,
  is_capital: false,
  protected_until: null,
  active_challenge_id: null,
  active_challenge_kind: null,
  active_challenge_user_id: null,
  active_challenge_until: null,
  active_battle_id: null,
  last_refresh_wave_id: null,
  last_taken_at: null,
};

describe('resolveChallengeSpec', () => {
  it('neutral normal uses the base capture profile', () => {
    const spec = resolveChallengeSpec(baseTile, 'gA', TERRITORY_DEFAULTS);

    expect(spec.kind).toBe('capture_normal');
    expect(spec.question_count).toBe(5);
    expect(spec.difficulty).toBe('standard');
    expect(spec.cost).toBe(10);
    expect(spec.success_reward).toBe(16);
  });

  it('enemy normal becomes reverse attack', () => {
    const spec = resolveChallengeSpec(
      { ...baseTile, owner_group_id: 'gB' },
      'gA',
      TERRITORY_DEFAULTS,
    );

    expect(spec.kind).toBe('reverse_normal');
    expect(spec.question_count).toBe(7);
    expect(spec.success_reward).toBe(20);
    expect(spec.fail_attacker_delta).toBe(-15);
    expect(spec.fail_defender_delta).toBe(5);
  });

  it('neutral 2x becomes advanced multiplier capture', () => {
    const spec = resolveChallengeSpec(
      { ...baseTile, kind: 'multiplier', multiplier: 2 },
      'gA',
      TERRITORY_DEFAULTS,
    );

    expect(spec.kind).toBe('capture_multiplier');
    expect(spec.question_count).toBe(10);
    expect(spec.difficulty).toBe('advanced');
    expect(spec.cost).toBe(20);
    expect(spec.success_reward).toBe(32);
  });

  it('enemy 3x becomes advanced multiplier reverse attack', () => {
    const spec = resolveChallengeSpec(
      { ...baseTile, kind: 'multiplier', multiplier: 3, owner_group_id: 'gB' },
      'gA',
      TERRITORY_DEFAULTS,
    );

    expect(spec.kind).toBe('reverse_multiplier');
    expect(spec.question_count).toBe(18);
    expect(spec.success_reward).toBe(60);
    expect(spec.fail_attacker_delta).toBe(-45);
    expect(spec.fail_defender_delta).toBe(15);
  });

  it('own 3x becomes self recapture', () => {
    const spec = resolveChallengeSpec(
      { ...baseTile, kind: 'multiplier', multiplier: 3, owner_group_id: 'gA' },
      'gA',
      TERRITORY_DEFAULTS,
    );

    expect(spec.kind).toBe('self_recapture_multiplier');
    expect(spec.question_count).toBe(10);
    expect(spec.cost).toBe(20);
    expect(spec.success_reward).toBe(32);
  });

  it('special tile routes to battle dispatch with net-zero reward', () => {
    const spec = resolveChallengeSpec(
      { ...baseTile, kind: 'special' },
      'gA',
      TERRITORY_DEFAULTS,
    );

    expect(spec.kind).toBe('capture_special');
    expect(spec.cost).toBe(50);
    expect(spec.success_reward).toBe(50);
  });
});

describe('challenge derivation helpers', () => {
  it('derives challenge kind from tile ownership + kind', () => {
    expect(deriveChallengeKind(baseTile, 'gA')).toBe('capture_normal');
    expect(deriveChallengeKind({ ...baseTile, owner_group_id: 'gB' }, 'gA')).toBe('reverse_normal');
    expect(
      deriveChallengeKind(
        { ...baseTile, kind: 'multiplier', multiplier: 2, owner_group_id: 'gA' },
        'gA',
      ),
    ).toBe('self_recapture_multiplier');
    expect(
      deriveChallengeKind(
        { ...baseTile, kind: 'special' },
        'gA',
      ),
    ).toBe('capture_special');
  });

  it('derives runtime challenge cost by challenge kind', () => {
    expect(
      deriveChallengeCost(
        { ...baseTile, kind: 'multiplier', multiplier: 3, owner_group_id: null },
        'capture_multiplier',
        TERRITORY_DEFAULTS,
      ),
    ).toBe(30);
    expect(
      deriveChallengeCost(
        { ...baseTile, kind: 'multiplier', multiplier: 3, owner_group_id: 'gA' },
        'self_recapture_multiplier',
        TERRITORY_DEFAULTS,
      ),
    ).toBe(20);
    expect(
      deriveChallengeCost(
        { ...baseTile, kind: 'special' },
        'capture_special',
        TERRITORY_DEFAULTS,
      ),
    ).toBe(50);
  });

  it('derives financial outcomes from challenge kind and cost', () => {
    expect(deriveChallengeOutcome('capture_normal', 10, TERRITORY_DEFAULTS)).toEqual({
      successReward: 16,
      additionalFailAttackerDelta: 0,
      failDefenderDelta: 0,
    });
    expect(deriveChallengeOutcome('reverse_normal', 10, TERRITORY_DEFAULTS)).toEqual({
      successReward: 20,
      additionalFailAttackerDelta: -5,
      failDefenderDelta: 5,
    });
    expect(deriveChallengeOutcome('capture_special', 50, TERRITORY_DEFAULTS)).toEqual({
      successReward: 50,
      additionalFailAttackerDelta: 0,
      failDefenderDelta: 0,
    });
  });
});
