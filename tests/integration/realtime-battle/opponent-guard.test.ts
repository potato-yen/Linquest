import { acceptBattleInvite, sendBattleInvite } from '../../../lib/realtime-battle/service';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from '../territory/fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('realtime battle opponent guard', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects inviting a defender who is already tied up in another battle', async () => {
    const fixture = await setupTwoGroupFixture();
    const firstTile = await fixture.makeAdjacentSpecialTileForAttacker();
    const secondTile = await fixture.makeAdjacentSpecialTileForAttacker();

    const pendingBattleId = await sendBattleInvite(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: firstTile.id,
      defender_user_id: fixture.defenderUserId,
    });

    const pendingInvite = await sendBattleInvite(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: secondTile.id,
      defender_user_id: fixture.defenderUserId,
    }).catch((error) => error);
    expect(String((pendingInvite as Error).message ?? pendingInvite)).toContain('OPPONENT_ALREADY_IN_BATTLE');

    await acceptBattleInvite(fixture.defenderSb, pendingBattleId);

    const thirdTile = await fixture.makeAdjacentSpecialTileForAttacker();
    const activeInvite = await sendBattleInvite(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: thirdTile.id,
      defender_user_id: fixture.defenderUserId,
    }).catch((error) => error);
    expect(String((activeInvite as Error).message ?? activeInvite)).toContain('OPPONENT_ALREADY_IN_BATTLE');
  });
});
