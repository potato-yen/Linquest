import { resetDb } from '../../setup/reset-db';
import { sendBattleInvite } from '../../../lib/realtime-battle/service';
import { setupTwoGroupFixture } from '../territory/fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('realtime battle territory handoff', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('apply_battle_result captures the tile and restores special reward to the winner group', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentSpecialTileForAttacker();
    const before = await fixture.getTreasury(fixture.attackerGroupId);

    const battleId = await sendBattleInvite(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
      defender_user_id: fixture.defenderUserId,
    });

    const { error } = await fixture.svc.rpc('apply_battle_result', {
      p_battle_id: battleId,
      p_winner_user_id: fixture.attackerUserId,
    });
    expect(error).toBeNull();

    expect(await fixture.getTreasury(fixture.attackerGroupId) - before).toBe(0);

    const { data: updatedTile } = await fixture.svc
      .from('hex_tiles')
      .select('owner_group_id, protected_until, active_battle_id')
      .eq('id', tile.id)
      .single();
    expect(updatedTile?.owner_group_id).toBe(fixture.attackerGroupId);
    expect(updatedTile?.protected_until).not.toBeNull();
    expect(updatedTile?.active_battle_id).toBeNull();

    const { data: captureEvents } = await fixture.svc
      .from('territory_events')
      .select('event_type, score_delta, payload')
      .eq('activity_id', fixture.activity_id)
      .eq('event_type', 'capture');
    const battleCapture = (captureEvents ?? []).find((event) => event.payload?.battle_id === battleId);
    expect(battleCapture?.score_delta).toBe(50);
  });

  it('release_battle_lock with refund restores treasury and clears the tile lock', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentSpecialTileForAttacker();
    const before = await fixture.getTreasury(fixture.attackerGroupId);

    const battleId = await sendBattleInvite(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
      defender_user_id: fixture.defenderUserId,
    });

    const { error } = await fixture.svc.rpc('release_battle_lock', {
      p_battle_id: battleId,
      p_refund: true,
    });
    expect(error).toBeNull();

    expect(await fixture.getTreasury(fixture.attackerGroupId) - before).toBe(0);

    const { data: releasedTile } = await fixture.svc
      .from('hex_tiles')
      .select('active_battle_id, active_challenge_id')
      .eq('id', tile.id)
      .single();
    expect(releasedTile?.active_battle_id).toBeNull();
    expect(releasedTile?.active_challenge_id).toBeNull();
  });
});
