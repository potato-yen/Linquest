import { endActivity, getLeaderboards } from '../../../lib/territory/settlement';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from './fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory settlement', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('ends the activity and returns both leaderboards', async () => {
    const fixture = await setupTwoGroupFixture();
    await endActivity(fixture.svc, fixture.activity_id);

    const { data: activity } = await fixture.svc
      .from('activities')
      .select('status')
      .eq('id', fixture.activity_id)
      .single();
    expect(activity!.status).toBe('ended');

    const leaderboards = await getLeaderboards(fixture.svc, fixture.activity_id);
    expect(leaderboards.treasury).toHaveLength(2);
    expect(leaderboards.territory).toHaveLength(2);
    expect(leaderboards.treasury[0].treasury).toBeGreaterThanOrEqual(leaderboards.treasury[1].treasury);
    expect(leaderboards.territory[0].owned_count).toBeGreaterThanOrEqual(leaderboards.territory[1].owned_count);
  });
});
