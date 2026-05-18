import { attemptCapture } from '../../../../lib/territory/arbitrator';

const serverSpec = {
  kind: 'reverse_multiplier',
  question_count: 18,
  difficulty: 'advanced',
  cost: 45,
  success_reward: 90,
  fail_attacker_delta: -68,
  fail_defender_delta: 23,
  applies_cooldown_on_success: true,
  applies_cooldown_on_fail: true,
} as const;

describe('attemptCapture', () => {
  it('uses the authoritative challenge spec returned by the RPC', async () => {
    const sb = {
      rpc: jest.fn().mockResolvedValue({
        data: [{
          challenge_id: 'challenge-1',
          tile: { id: 'tile-1', kind: 'multiplier', multiplier: 3 },
          spec: serverSpec,
        }],
        error: null,
      }),
    } as any;

    const result = await attemptCapture(sb, {
      activity_id: 'activity-1',
      tile_id: 'tile-1',
      params: { cost_3x: 999 } as any,
    });

    expect(sb.rpc).toHaveBeenCalledWith('attempt_capture', {
      p_activity_id: 'activity-1',
      p_tile_id: 'tile-1',
    });
    expect(result).toEqual({
      challenge_id: 'challenge-1',
      tile: { id: 'tile-1', kind: 'multiplier', multiplier: 3 },
      spec: serverSpec,
    });
  });

  it('maps RPC rejections to TerritoryError codes', async () => {
    const sb = {
      rpc: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'LOCKED_BY_OTHER' },
      }),
    } as any;

    await expect(
      attemptCapture(sb, {
        activity_id: 'activity-1',
        tile_id: 'tile-1',
      }),
    ).rejects.toMatchObject({ code: 'LOCKED_BY_OTHER' });
  });
});
