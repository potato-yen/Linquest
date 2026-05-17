import { deleteActivity, publishActivity } from '../../../lib/teacher-console/service';
import { resetDb } from '../../setup/reset-db';
import { setupTeacherConsoleFixture, seedCustomActivity } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('deleteActivity (wrapper)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('hard-deletes a published activity and its custom bank', async () => {
    const f = await setupTeacherConsoleFixture();
    const { activityId, bankId } = await seedCustomActivity(f);
    await publishActivity(f.teacherSb, activityId);
    await deleteActivity(f.teacherSb, activityId);

    const { count: actCount } = await f.serviceSb
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('id', activityId);
    const { count: bankCount } = await f.serviceSb
      .from('question_banks')
      .select('*', { count: 'exact', head: true })
      .eq('id', bankId);
    expect(actCount ?? 0).toBe(0);
    expect(bankCount ?? 0).toBe(0);
  });

  it('maps ACTIVITY_NOT_FOUND for unknown activity', async () => {
    const f = await setupTeacherConsoleFixture();
    await expect(
      deleteActivity(f.teacherSb, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ code: 'ACTIVITY_NOT_FOUND' });
  });
});
