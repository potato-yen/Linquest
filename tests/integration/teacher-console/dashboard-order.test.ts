import { getActivityDashboard } from '../../../lib/teacher-console/service';
import { resetDb } from '../../setup/reset-db';
import { createPublishedActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console dashboard ordering', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('orders group rows numerically when there are 10 groups', async () => {
    const fixture = await setupTeacherConsoleFixture({ studentCount: 10 });
    const activityId = await createPublishedActivity(fixture, { group_count: 10 });

    const dashboard = await getActivityDashboard(fixture.teacherSb, activityId);

    expect(dashboard.groups.map((group) => group.name)).toEqual([
      '1組', '2組', '3組', '4組', '5組',
      '6組', '7組', '8組', '9組', '10組',
    ]);
  });
});
