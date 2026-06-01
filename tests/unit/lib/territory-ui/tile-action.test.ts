import { getTileActionState } from '../../../../lib/territory-ui/tile-action';

describe('tile action state', () => {
  it('blocks attacks when treasury is below cost even if adjacency is valid', () => {
    expect(getTileActionState({
      isEnded: false,
      isCooldown: false,
      hasActiveChallenge: false,
      attackableByAdjacency: true,
      treasury: 4,
      cost: 10,
    })).toEqual({
      canAttack: false,
      disabledReason: 'insufficient_treasury',
    });
  });

  it('returns attackable when adjacency and treasury are both sufficient', () => {
    expect(getTileActionState({
      isEnded: false,
      isCooldown: false,
      hasActiveChallenge: false,
      attackableByAdjacency: true,
      treasury: 16,
      cost: 10,
    })).toEqual({
      canAttack: true,
      disabledReason: null,
    });
  });

  it('prioritizes lock and cooldown over treasury messaging', () => {
    expect(getTileActionState({
      isEnded: false,
      isCooldown: false,
      hasActiveChallenge: true,
      attackableByAdjacency: true,
      treasury: 0,
      cost: 10,
    }).disabledReason).toBe('locked');

    expect(getTileActionState({
      isEnded: false,
      isCooldown: true,
      hasActiveChallenge: false,
      attackableByAdjacency: true,
      treasury: 0,
      cost: 10,
    }).disabledReason).toBe('cooldown');
  });
});
