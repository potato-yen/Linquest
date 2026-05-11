import { getActivityDashboard } from '../../../lib/teacher-console/service';
import { resetDb } from '../../setup/reset-db';
import { createPublishedActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console dashboard', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns aggregated group and map state for active activities', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);

    const dashboard = await getActivityDashboard(fixture.teacherSb, activityId);

    expect(dashboard.activity.id).toBe(activityId);
    expect(dashboard.activity.status).toBe('active');
    expect(dashboard.activity.effective_end_at).toBe(dashboard.activity.ends_at);
    expect(dashboard.groups).toHaveLength(3);
    expect(dashboard.map_summary.total_tiles).toBeGreaterThan(50);
  });

  it('computes effective_end_at from sudden-death when it is earlier than ends_at', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);
    const suddenDeathStartedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await fixture.serviceSb
      .from('activities')
      .update({
        ends_at: endsAt,
        sudden_death_started_at: suddenDeathStartedAt,
      })
      .eq('id', activityId);

    const dashboard = await getActivityDashboard(fixture.teacherSb, activityId);
    const expected = new Date(new Date(suddenDeathStartedAt).getTime() + 12 * 60 * 60 * 1000);

    expect(new Date(dashboard.activity.effective_end_at!).toISOString()).toBe(expected.toISOString());
  });
});
