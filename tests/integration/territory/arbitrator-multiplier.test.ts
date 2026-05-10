import { attemptCapture, resolveChallenge } from '../../../lib/territory/arbitrator';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from './fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory arbitrator multiplier flow', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('neutral 2x capture pays 20, earns 32, and degrades to normal', async () => {
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
    expect(updated!.kind).toBe('normal');
    expect(updated!.multiplier).toBeNull();
    expect(updated!.owner_group_id).toBe(fixture.attackerGroupId);
  });
});
