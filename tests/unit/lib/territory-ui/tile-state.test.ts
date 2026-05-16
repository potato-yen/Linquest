import { computeTileRender } from '../../../../lib/territory-ui/tile-state';
import type { HexTile } from '../../../../lib/territory/types';

const baseTile = (overrides: Partial<HexTile>): HexTile => ({
  id: 't1', map_id: 'm1', q: 0, r: 0, kind: 'normal', multiplier: null,
  owner_group_id: null, is_capital: false, protected_until: null,
  active_challenge_id: null, active_challenge_kind: null, active_challenge_user_id: null,
  active_challenge_until: null, active_battle_id: null,
  last_refresh_wave_id: null, last_taken_at: null,
  ...overrides,
});

describe('computeTileRender', () => {
  it('neutral tile: ownership=neutral, no badges', () => {
    const r = computeTileRender(baseTile({}), { myGroupId: 'g1', now: new Date('2026-05-14') });
    expect(r.ownership).toBe('neutral');
    expect(r.isMultiplier).toBe(false);
    expect(r.isSpecial).toBe(false);
  });

  it('owned by self: ownership=self', () => {
    const r = computeTileRender(baseTile({ owner_group_id: 'g1' }), { myGroupId: 'g1', now: new Date() });
    expect(r.ownership).toBe('self');
  });

  it('owned by other: ownership=other', () => {
    const r = computeTileRender(baseTile({ owner_group_id: 'g2' }), { myGroupId: 'g1', now: new Date() });
    expect(r.ownership).toBe('other');
  });

  it('cooldown: protected_until > now', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const r = computeTileRender(baseTile({ protected_until: future, owner_group_id: 'g1' }), { myGroupId: 'g1', now: new Date() });
    expect(r.isCooldown).toBe(true);
  });

  it('capital flag passes through', () => {
    const r = computeTileRender(baseTile({ is_capital: true, owner_group_id: 'g1' }), { myGroupId: 'g1', now: new Date() });
    expect(r.isCapital).toBe(true);
  });

  it('multiplier kind sets isMultiplier and exposes value', () => {
    const r = computeTileRender(baseTile({ kind: 'multiplier', multiplier: 2 }), { myGroupId: 'g1', now: new Date() });
    expect(r.isMultiplier).toBe(true);
    expect(r.multiplier).toBe(2);
  });

  it('special kind sets isSpecial', () => {
    const r = computeTileRender(baseTile({ kind: 'special' }), { myGroupId: 'g1', now: new Date() });
    expect(r.isSpecial).toBe(true);
  });
});
