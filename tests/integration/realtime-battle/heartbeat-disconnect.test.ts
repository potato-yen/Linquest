import { resetDb } from '../../setup/reset-db';
import {
  createAcceptedBattle,
  forceBattleQuestionWindow,
  getBattleRow,
} from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('realtime battle disconnect watchdog', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('finishes the battle in favor of the connected player when one side goes stale', async () => {
    const { fixture, battleId, tileId } = await createAcceptedBattle();
    await forceBattleQuestionWindow(fixture, battleId);

    const stale = new Date(Date.now() - 120_000).toISOString();
    const fresh = new Date().toISOString();
    await fixture.svc
      .from('battles')
      .update({
        challenger_last_heartbeat_at: stale,
        defender_last_heartbeat_at: fresh,
      })
      .eq('id', battleId);

    const { data, error } = await fixture.svc.rpc('expire_battle_disconnects');
    expect(error).toBeNull();
    expect(data).toBe(1);

    const battle = await getBattleRow(fixture, battleId);
    expect(battle.status).toBe('finished');
    expect(battle.winner_user_id).toBe(fixture.defenderUserId);

    const { data: tile } = await fixture.svc
      .from('hex_tiles')
      .select('owner_group_id, active_battle_id')
      .eq('id', tileId)
      .single();
    expect(tile?.owner_group_id).toBe(fixture.defenderGroupId);
    expect(tile?.active_battle_id).toBeNull();
  });

  it('aborts and clears the lock when both players go stale', async () => {
    const { fixture, battleId, tileId } = await createAcceptedBattle();
    await forceBattleQuestionWindow(fixture, battleId);

    const stale = new Date(Date.now() - 120_000).toISOString();
    await fixture.svc
      .from('battles')
      .update({
        challenger_last_heartbeat_at: stale,
        defender_last_heartbeat_at: stale,
      })
      .eq('id', battleId);

    const { data, error } = await fixture.svc.rpc('expire_battle_disconnects');
    expect(error).toBeNull();
    expect(data).toBe(1);

    const battle = await getBattleRow(fixture, battleId);
    expect(battle.status).toBe('aborted');
    expect(battle.abort_reason).toBe('both_disconnected');

    const { data: tile } = await fixture.svc
      .from('hex_tiles')
      .select('owner_group_id, active_battle_id')
      .eq('id', tileId)
      .single();
    expect(tile?.owner_group_id).toBeNull();
    expect(tile?.active_battle_id).toBeNull();
  });
});
