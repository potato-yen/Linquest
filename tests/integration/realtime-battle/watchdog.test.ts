import { signIn, signUp } from '../../../lib/auth/service';
import { sendBattleInvite, submitBattleAnswer } from '../../../lib/realtime-battle/service';
import { resetDb } from '../../setup/reset-db';
import { makeAnonClient } from '../../setup/supabase-test-client';
import { setupTwoGroupFixture } from '../territory/fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('realtime battle watchdog and security regressions', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects late-path battle submissions from non-players', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentSpecialTileForAttacker();
    const battleId = await sendBattleInvite(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
      defender_user_id: fixture.defenderUserId,
    });

    const { data: battle } = await fixture.svc
      .from('battles')
      .update({
        status: 'in_progress',
        current_index: 1,
        reveal_at: new Date(Date.now() - 1_000).toISOString(),
        question_deadline_at: new Date(Date.now() + 30_000).toISOString(),
      })
      .eq('id', battleId)
      .select('id')
      .single();
    expect(battle?.id).toBe(battleId);

    const outsider = makeAnonClient();
    await signUp(outsider, {
      email: 'battle-outsider@test.com',
      password: 'pw-12345678',
      role: 'student',
    });
    await signIn(outsider, {
      email: 'battle-outsider@test.com',
      password: 'pw-12345678',
    });

    await expect(
      submitBattleAnswer(outsider, {
        battle_id: battleId,
        question_index: 0,
        choice: '放棄',
        response_ms: 900,
      }),
    ).rejects.toMatchObject({ code: 'NOT_A_PLAYER' });
  });

  it('orphan lock sweep refunds declined invites', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.makeAdjacentSpecialTileForAttacker();
    const before = await fixture.getTreasury(fixture.attackerGroupId);
    const battleId = await sendBattleInvite(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
      defender_user_id: fixture.defenderUserId,
    });

    await fixture.svc
      .from('battles')
      .update({
        status: 'aborted',
        abort_reason: 'invite_declined',
        ended_at: new Date().toISOString(),
      })
      .eq('id', battleId);

    const { error } = await fixture.svc.rpc('sweep_orphan_battle_locks');
    expect(error).toBeNull();

    expect(await fixture.getTreasury(fixture.attackerGroupId) - before).toBe(0);

    const { data: tileAfter } = await fixture.svc
      .from('hex_tiles')
      .select('active_battle_id, active_challenge_id')
      .eq('id', tile.id)
      .single();
    expect(tileAfter?.active_battle_id).toBeNull();
    expect(tileAfter?.active_challenge_id).toBeNull();

    const { data: refundEvents } = await fixture.svc
      .from('territory_events')
      .select('score_delta, payload')
      .eq('activity_id', fixture.activity_id)
      .eq('event_type', 'challenge_cost');
    const refundEvent = (refundEvents ?? []).find((event) => event.payload?.refund === true);
    expect(refundEvent?.score_delta).toBe(50);
  });
});
