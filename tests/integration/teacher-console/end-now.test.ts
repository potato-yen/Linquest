import { endActivityNow } from '../../../lib/teacher-console/service';
import { resetDb } from '../../setup/reset-db';
import { createPublishedActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console end activity now', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('lets the teacher force-end an active activity', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);

    await endActivityNow(fixture.teacherSb, activityId);

    const { data: activity } = await fixture.serviceSb
      .from('activities')
      .select('status')
      .eq('id', activityId)
      .single();
    expect(activity?.status).toBe('ended');
  });
});
