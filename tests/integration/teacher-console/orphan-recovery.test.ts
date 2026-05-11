import { publishActivity } from '../../../lib/teacher-console/service';
import { resetDb } from '../../setup/reset-db';
import { createDraftActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console orphan publish recovery', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('lets a retry recover from draft activities that already have orphan groups', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createDraftActivity(fixture);

    const { error: snapshotError } = await fixture.teacherSb.rpc('snapshot_class_and_create_groups', {
      p_activity_id: activityId,
    });
    expect(snapshotError).toBeNull();

    await expect(publishActivity(fixture.teacherSb, activityId)).rejects.toMatchObject({
      code: 'GROUPS_ALREADY_EXIST',
    });

    const { count: groupCount } = await fixture.serviceSb
      .from('groups')
      .select('*', { head: true, count: 'exact' })
      .eq('activity_id', activityId);
    expect(groupCount).toBe(0);

    const { data: activity } = await fixture.serviceSb
      .from('activities')
      .select('status, starts_at, map_id')
      .eq('id', activityId)
      .single();
    expect(activity).toMatchObject({
      status: 'draft',
      starts_at: null,
      map_id: null,
    });
  });
});
