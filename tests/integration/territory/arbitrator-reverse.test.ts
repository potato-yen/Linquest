import { attemptCapture, resolveChallenge } from '../../../lib/territory/arbitrator';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from './fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory arbitrator reverse flow', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('reverse success switches owner and nets attacker +10', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentEnemyTileForAttacker();
    const attackerBefore = await fixture.getTreasury(fixture.attackerGroupId);
    const defenderBefore = await fixture.getTreasury(fixture.defenderGroupId);

    const capture = await attemptCapture(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
    });
    expect(capture.spec.kind).toBe('reverse_normal');

    await resolveChallenge(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      challenge_id: capture.challenge_id,
      tile_id: tile.id,
      kind: capture.spec.kind,
      all_correct: true,
      spec: capture.spec,
    });

    expect(await fixture.getTreasury(fixture.attackerGroupId) - attackerBefore).toBe(10);
    expect(await fixture.getTreasury(fixture.defenderGroupId) - defenderBefore).toBe(0);

    const { data: updated } = await fixture.svc
      .from('hex_tiles')
      .select('owner_group_id')
      .eq('id', tile.id)
      .single();
    expect(updated!.owner_group_id).toBe(fixture.attackerGroupId);
  });

  it('reverse failure costs attacker 15 and gives defender 5', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentEnemyTileForAttacker();
    const attackerBefore = await fixture.getTreasury(fixture.attackerGroupId);
    const defenderBefore = await fixture.getTreasury(fixture.defenderGroupId);

    const capture = await attemptCapture(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
    });

    await resolveChallenge(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      challenge_id: capture.challenge_id,
      tile_id: tile.id,
      kind: capture.spec.kind,
      all_correct: false,
      spec: capture.spec,
    });

    expect(await fixture.getTreasury(fixture.attackerGroupId) - attackerBefore).toBe(-15);
    expect(await fixture.getTreasury(fixture.defenderGroupId) - defenderBefore).toBe(5);
  });
});
