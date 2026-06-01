import type { HexTile } from '../../../../lib/territory/types';
import { formatRemainingMs, getTileTiming } from '../../../../lib/territory-ui/tile-timing';

const baseTile = (overrides: Partial<HexTile>): HexTile => ({
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
  ...overrides,
});

describe('tile timing', () => {
  const now = new Date('2026-06-02T02:50:00.000Z');

  it('prefers active challenge locks over cooldown status', () => {
    const timing = getTileTiming(baseTile({
      active_challenge_id: 'c1',
      active_challenge_until: '2026-06-02T02:51:30.000Z',
      protected_until: '2026-06-02T02:55:00.000Z',
    }), now);

    expect(timing.status).toBe('locked');
    expect(timing.remainingMs).toBe(90_000);
  });

  it('returns cooldown timing when the protection window is still live', () => {
    const timing = getTileTiming(baseTile({
      protected_until: '2026-06-02T02:54:00.000Z',
    }), now);

    expect(timing.status).toBe('cooldown');
    expect(timing.remainingMs).toBe(240_000);
  });

  it('returns no status after both lock and cooldown have expired', () => {
    const timing = getTileTiming(baseTile({
      active_challenge_id: 'c1',
      active_challenge_until: '2026-06-02T02:49:00.000Z',
      protected_until: '2026-06-02T02:49:30.000Z',
    }), now);

    expect(timing).toEqual({
      status: null,
      endsAt: null,
      remainingMs: 0,
    });
  });

  it('formats remaining milliseconds as mm:ss', () => {
    expect(formatRemainingMs(90_000)).toBe('01:30');
    expect(formatRemainingMs(3_000)).toBe('00:03');
  });
});
