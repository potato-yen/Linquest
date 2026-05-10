import { getActivityState } from '../../../lib/territory/state';
import { resetDb } from '../../setup/reset-db';
import { setupTwoGroupFixture } from './fixtures';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory state', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns activity status, groups, and tiles', async () => {
    const fixture = await setupTwoGroupFixture();
    const state = await getActivityState(fixture.svc, fixture.activity_id);

    expect(state.status).toBe('active');
    expect(state.groups).toHaveLength(2);
    expect(state.tiles.length).toBeGreaterThan(50);
  });
});
