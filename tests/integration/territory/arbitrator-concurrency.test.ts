import { signIn } from '../../../lib/auth/service';
import { attemptCapture } from '../../../lib/territory/arbitrator';
import { makeAnonClient } from '../../setup/supabase-test-client';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from './fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory arbitrator concurrency lock', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('only one session can lock the same tile and only one cost is charged', async () => {
    const fixture = await setupTwoGroupFixture();
    const tile = await fixture.findAdjacentNeutralForGroup(fixture.attackerGroupId);
    const duplicateAttacker = makeAnonClient();
    await signIn(duplicateAttacker, fixture.attackerCredentials);
    const before = await fixture.getTreasury(fixture.attackerGroupId);

    const first = await attemptCapture(fixture.attackerSb, {
      activity_id: fixture.activity_id,
      tile_id: tile.id,
    });
    await expect(
      attemptCapture(duplicateAttacker, {
        activity_id: fixture.activity_id,
        tile_id: tile.id,
      }),
    ).rejects.toMatchObject({ code: 'LOCKED_BY_OTHER' });

    expect(first.challenge_id).toBeTruthy();
    expect(await fixture.getTreasury(fixture.attackerGroupId) - before).toBe(-10);
  });
});
