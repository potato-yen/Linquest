import {
  acceptBattleInvite,
  declineBattleInvite,
  sendBattleInvite,
} from '../../../lib/realtime-battle/service';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from '../territory/fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('realtime battle invite flow', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates a pending battle, debits treasury, and locks the special tile', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentSpecialTileForAttacker();
    const before = await fixture.getTreasury(fixture.attackerGroupId);

    const battleId = await sendBattleInvite(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
      defender_user_id: fixture.defenderUserId,
    });

    expect(await fixture.getTreasury(fixture.attackerGroupId) - before).toBe(-50);

    const { data: battle } = await fixture.svc
      .from('battles')
      .select('id, status, challenger_user_id, defender_user_id, question_ids')
      .eq('id', battleId)
      .single();
    expect(battle).toMatchObject({
      id: battleId,
      status: 'pending_invite',
      challenger_user_id: fixture.attackerUserId,
      defender_user_id: fixture.defenderUserId,
    });
    expect((battle?.question_ids ?? [])).toHaveLength(5);

    const { data: lockedTile } = await fixture.svc
      .from('hex_tiles')
      .select('active_battle_id, active_challenge_id')
      .eq('id', tile.id)
      .single();
    expect(lockedTile?.active_battle_id).toBe(battleId);
    expect(lockedTile?.active_challenge_id).toBe(battleId);
  });

  it('accepts and declines invites through the defender account', async () => {
    const fixture = await setupTwoGroupFixture();
    const acceptedTile = await fixture.makeAdjacentSpecialTileForAttacker();
    const acceptedBattleId = await sendBattleInvite(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: acceptedTile.id,
      defender_user_id: fixture.defenderUserId,
    });

    await acceptBattleInvite(fixture.defenderSb, acceptedBattleId);

    const { data: acceptedBattle } = await fixture.svc
      .from('battles')
      .select('status, reveal_at, question_deadline_at')
      .eq('id', acceptedBattleId)
      .single();
    expect(acceptedBattle?.status).toBe('in_progress');
    expect(acceptedBattle?.reveal_at).not.toBeNull();
    expect(acceptedBattle?.question_deadline_at).not.toBeNull();

    const declinedTile = await fixture.makeAdjacentSpecialTileForAttacker();
    const beforeRefund = await fixture.getTreasury(fixture.attackerGroupId);
    const declinedBattleId = await sendBattleInvite(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: declinedTile.id,
      defender_user_id: fixture.defenderUserId,
    });

    await declineBattleInvite(fixture.defenderSb, declinedBattleId);

    expect(await fixture.getTreasury(fixture.attackerGroupId) - beforeRefund).toBe(0);

    const { data: declinedBattle } = await fixture.svc
      .from('battles')
      .select('status, abort_reason, ended_at')
      .eq('id', declinedBattleId)
      .single();
    expect(declinedBattle).toMatchObject({
      status: 'aborted',
      abort_reason: 'invite_declined',
    });
    expect(declinedBattle?.ended_at).not.toBeNull();

    const { data: releasedTile } = await fixture.svc
      .from('hex_tiles')
      .select('active_battle_id, active_challenge_id')
      .eq('id', declinedTile.id)
      .single();
    expect(releasedTile?.active_battle_id).toBeNull();
    expect(releasedTile?.active_challenge_id).toBeNull();
  });
});
