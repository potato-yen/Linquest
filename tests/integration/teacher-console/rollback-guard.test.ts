import { resetDb } from '../../setup/reset-db';
import { createPublishedActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console rollback guard', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects rollback_activity_publish for active activities instead of deleting live game data', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);

    const { error } = await fixture.teacherSb.rpc('rollback_activity_publish', {
      p_activity_id: activityId,
    });
    expect(error?.message).toContain('ACTIVITY_NOT_DRAFT');

    const { data: activity } = await fixture.serviceSb
      .from('activities')
      .select('status, map_id')
      .eq('id', activityId)
      .single();
    expect(activity?.status).toBe('active');
    expect(activity?.map_id).not.toBeNull();

    const { count: groupCount } = await fixture.serviceSb
      .from('groups')
      .select('*', { head: true, count: 'exact' })
      .eq('activity_id', activityId);
    expect(groupCount).toBeGreaterThan(0);
  });
});
