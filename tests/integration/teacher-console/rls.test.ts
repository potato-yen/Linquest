import { getActivityDashboard } from '../../../lib/teacher-console/service';
import { signIn, signUp } from '../../../lib/auth/service';
import { createClass } from '../../../lib/classes/service';
import { resetDb } from '../../setup/reset-db';
import { makeAnonClient } from '../../setup/supabase-test-client';
import { createPublishedActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console access control', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects dashboard reads from a different teacher', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);

    const otherTeacher = makeAnonClient();
    await signUp(otherTeacher, {
      email: 'teacher-console-other@test.com',
      password: 'pw-12345678',
      role: 'teacher',
    });
    await signIn(otherTeacher, {
      email: 'teacher-console-other@test.com',
      password: 'pw-12345678',
    });
    await createClass(otherTeacher, { name: 'Other Teacher Class' });

    await expect(getActivityDashboard(otherTeacher, activityId)).rejects.toMatchObject({
      code: 'NOT_CLASS_OWNER',
    });
  });
});
