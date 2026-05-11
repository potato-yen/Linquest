import { signIn } from '../../../lib/auth/service';
import { acceptBattleInvite, sendBattleInvite } from '../../../lib/realtime-battle/service';
import { attemptCapture } from '../../../lib/territory/arbitrator';
import { resetDb } from '../../setup/reset-db';
import { makeAnonClient } from '../../setup/supabase-test-client';
import { createPublishedActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

const ADJACENT_STEPS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
] as const;

describeIntegration('teacher console publish regression smoke', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('produces an active activity that still supports territory capture and battle invite flow', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);

    const attackerSb = makeAnonClient();
    await signIn(attackerSb, fixture.studentCredentials[0]);
    const defenderSb = makeAnonClient();
    await signIn(defenderSb, fixture.studentCredentials[1]);

    const { data: attackerMembership } = await fixture.serviceSb
      .from('group_members')
      .select('group_id')
      .eq('user_id', fixture.studentIds[0])
      .single();
    const { data: defenderMembership } = await fixture.serviceSb
      .from('group_members')
      .select('group_id')
      .eq('user_id', fixture.studentIds[1])
      .single();
    const { data: activity } = await fixture.serviceSb
      .from('activities')
      .select('map_id')
      .eq('id', activityId)
      .single();

    const { data: ownedTiles } = await fixture.serviceSb
      .from('hex_tiles')
      .select('id, q, r, is_capital')
      .eq('map_id', activity!.map_id)
      .eq('owner_group_id', attackerMembership!.group_id);
    const { data: allTiles } = await fixture.serviceSb
      .from('hex_tiles')
      .select('id, q, r, kind, is_capital, owner_group_id')
      .eq('map_id', activity!.map_id);

    const neutralTile = allTiles!.find((tile) =>
      tile.owner_group_id === null &&
      !tile.is_capital &&
      ownedTiles!.some((ownedTile) =>
        ADJACENT_STEPS.some(([q, r]) => tile.q - ownedTile.q === q && tile.r - ownedTile.r === r),
      ),
    );
    expect(neutralTile).toBeDefined();

    const capture = await attemptCapture(attackerSb, {
      activity_id: activityId,
      tile_id: neutralTile!.id,
    });
    expect(capture.spec.kind).toBe('capture_normal');

    await fixture.serviceSb
      .from('hex_tiles')
      .update({
        kind: 'special',
        multiplier: null,
        owner_group_id: null,
      })
      .eq('id', neutralTile!.id);

    const battleId = await sendBattleInvite(attackerSb, {
      activity_id: activityId,
      tile_id: neutralTile!.id,
      defender_user_id: fixture.studentIds[1],
    });
    await acceptBattleInvite(defenderSb, battleId);

    const { data: battle } = await fixture.serviceSb
      .from('battles')
      .select('status, challenger_user_id, defender_user_id')
      .eq('id', battleId)
      .single();
    expect(battle).toMatchObject({
      status: 'in_progress',
      challenger_user_id: fixture.studentIds[0],
      defender_user_id: fixture.studentIds[1],
    });

    expect(attackerMembership?.group_id).not.toBe(defenderMembership?.group_id);
  });
});
