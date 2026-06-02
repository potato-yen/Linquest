import { attemptCapture, resolveChallenge } from '../../../lib/territory/arbitrator';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from './fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory arbitrator multiplier flow', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('neutral 2x capture pays 20, earns 32, and preserves multiplier value', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentMultiplierTileForAttacker(2);
    const before = await fixture.getTreasury(fixture.attackerGroupId);

    const capture = await attemptCapture(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
    });
    expect(capture.spec.kind).toBe('capture_multiplier');
    expect(capture.spec.cost).toBe(20);
    expect(capture.spec.success_reward).toBe(32);

    await resolveChallenge(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      challenge_id: capture.challenge_id,
      tile_id: tile.id,
      kind: capture.spec.kind,
      all_correct: true,
      spec: capture.spec,
    });

    expect(await fixture.getTreasury(fixture.attackerGroupId) - before).toBe(12);

    const { data: updated } = await fixture.svc
      .from('hex_tiles')
      .select('kind, multiplier, owner_group_id')
      .eq('id', tile.id)
      .single();
    expect(updated!.kind).toBe('multiplier');
    expect(updated!.multiplier).toBe(2);
    expect(updated!.owner_group_id).toBe(fixture.attackerGroupId);
  });

  it('self-recapture failure preserves multiplier value and clears the lock', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentMultiplierTileForAttacker(2, fixture.attackerGroupId);

    const capture = await attemptCapture(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
    });
    expect(capture.spec.kind).toBe('self_recapture_multiplier');

    await resolveChallenge(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      challenge_id: capture.challenge_id,
      tile_id: tile.id,
      kind: capture.spec.kind,
      all_correct: false,
      spec: capture.spec,
    });

    const { data: updated } = await fixture.svc
      .from('hex_tiles')
      .select('kind, multiplier, active_challenge_id')
      .eq('id', tile.id)
      .single();
    expect(updated!.kind).toBe('multiplier');
    expect(updated!.multiplier).toBe(2);
    expect(updated!.active_challenge_id).toBeNull();

    const { data: events } = await fixture.svc
      .from('territory_events')
      .select('event_type, score_delta, payload')
      .eq('tile_id', tile.id)
      .eq('event_type', 'multiplier_self_recapture');
    expect(events!.some((event) => event.score_delta === 0 && event.payload.role === 'fail')).toBe(true);
  });
});
