import { attemptCapture, resolveChallenge } from '../../../lib/territory/arbitrator';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from './fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory arbitrator special flow', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('locking a neutral special tile debits 50 and sets active_battle_id', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentSpecialTileForAttacker();
    const before = await fixture.getTreasury(fixture.attackerGroupId);

    const capture = await attemptCapture(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
    });

    expect(capture.spec.kind).toBe('capture_special');
    expect(capture.spec.cost).toBe(50);
    expect(await fixture.getTreasury(fixture.attackerGroupId) - before).toBe(-50);

    const { data: lockedTile } = await fixture.svc
      .from('hex_tiles')
      .select('active_battle_id, active_challenge_id')
      .eq('id', tile.id)
      .single();
    expect(lockedTile!.active_battle_id).toBeTruthy();
    expect(lockedTile!.active_battle_id).toBe(lockedTile!.active_challenge_id);
  });

  it('special success is net-zero and sets protected_until', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentSpecialTileForAttacker();
    const before = await fixture.getTreasury(fixture.attackerGroupId);
    const capture = await attemptCapture(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
    });

    await resolveChallenge(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      challenge_id: capture.challenge_id,
      tile_id: tile.id,
      kind: capture.spec.kind,
      all_correct: true,
      spec: capture.spec,
    });

    expect(await fixture.getTreasury(fixture.attackerGroupId) - before).toBe(0);
    const { data: updated } = await fixture.svc
      .from('hex_tiles')
      .select('owner_group_id, protected_until, active_battle_id')
      .eq('id', tile.id)
      .single();
    expect(updated!.owner_group_id).toBe(fixture.attackerGroupId);
    expect(updated!.protected_until).not.toBeNull();
    expect(updated!.active_battle_id).toBeNull();
  });

  it('special failure keeps the tile neutral and clears battle lock', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentSpecialTileForAttacker();
    const before = await fixture.getTreasury(fixture.attackerGroupId);
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

    expect(await fixture.getTreasury(fixture.attackerGroupId) - before).toBe(-50);
    const { data: updated } = await fixture.svc
      .from('hex_tiles')
      .select('owner_group_id, active_battle_id, active_challenge_id')
      .eq('id', tile.id)
      .single();
    expect(updated!.owner_group_id).toBeNull();
    expect(updated!.active_battle_id).toBeNull();
    expect(updated!.active_challenge_id).toBeNull();
  });
});
