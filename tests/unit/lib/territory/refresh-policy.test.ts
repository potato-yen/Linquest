import { pickRefreshTargets } from '../../../../lib/territory/refresh-policy';
import { HexTile, TERRITORY_DEFAULTS } from '../../../../lib/territory/types';

function tile(id: string, kind: HexTile['kind'], extra: Partial<HexTile> = {}): HexTile {
  return {
    id,
    map_id: 'm',
    q: 0,
    r: 0,
    kind,
    multiplier: null,
    owner_group_id: null,
    is_capital: false,
    protected_until: null,
    active_challenge_user_id: null,
    active_challenge_until: null,
    active_battle_id: null,
    last_refresh_wave_id: null,
    last_taken_at: null,
    ...extra,
  };
}

describe('pickRefreshTargets', () => {
  it('places multipliers only on non-capital tiles', () => {
    const tiles: HexTile[] = Array.from({ length: 100 }, (_, index) => tile(`t${index}`, 'normal'));
    tiles[0] = tile('cap', 'normal', { is_capital: true });

    const result = pickRefreshTargets(tiles, [], TERRITORY_DEFAULTS, () => 0.5);

    expect(result.multiplier_targets.length).toBeGreaterThanOrEqual(11);
    expect(result.multiplier_targets.length).toBeLessThanOrEqual(13);
    expect(result.multiplier_targets.find((item) => item.tile.is_capital)).toBeUndefined();
  });

  it('special targets exclude previous special positions', () => {
    const tiles: HexTile[] = Array.from({ length: 100 }, (_, index) => tile(`t${index}`, 'normal'));
    const previous = ['t10', 't11', 't12'];

    const result = pickRefreshTargets(tiles, previous, TERRITORY_DEFAULTS, () => 0.3);

    expect(result.special_targets.find((item) => previous.includes(item.id))).toBeUndefined();
  });

  it('switches to endgame policy when neutral share falls below threshold', () => {
    const tiles: HexTile[] = Array.from({ length: 100 }, (_, index) =>
      tile(`t${index}`, 'normal', index < 90 ? { owner_group_id: 'g1' } : {}),
    );

    const result = pickRefreshTargets(tiles, [], TERRITORY_DEFAULTS, () => 0.5);

    expect(result.policy).toBe('endgame_all_special');
    expect(result.special_targets.length).toBe(10);
  });

  it('returns no special targets when no neutral tiles remain', () => {
    const tiles: HexTile[] = Array.from({ length: 50 }, (_, index) =>
      tile(`t${index}`, 'normal', { owner_group_id: 'g1' }),
    );

    const result = pickRefreshTargets(tiles, [], TERRITORY_DEFAULTS, () => 0.5);

    expect(result.special_targets.length).toBe(0);
  });
});
