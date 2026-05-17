import { signIn, signUp } from '../../../lib/auth/service';
import { createClass } from '../../../lib/classes/service';
import { resetDb } from '../../setup/reset-db';
import { makeAnonClient } from '../../setup/supabase-test-client';
import { setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('list_class_roster', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns every class member to the owner teacher', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const { data, error } = await fixture.teacherSb.rpc('list_class_roster', {
      p_class_id: fixture.classId,
    });

    expect(error).toBeNull();
    const ids = (data as Array<{ user_id: string; joined_at: string }>).map((row) => row.user_id);
    expect(ids.sort()).toEqual([...fixture.studentIds].sort());
    expect((data as Array<{ joined_at: string }>).every((row) => !!row.joined_at)).toBe(true);
  });

  it('returns an empty set to a non-owner teacher', async () => {
    const fixture = await setupTeacherConsoleFixture();

    const other = makeAnonClient();
    await signUp(other, {
      email: 'roster-other@test.com',
      password: 'pw-12345678',
      role: 'teacher',
    });
    await signIn(other, { email: 'roster-other@test.com', password: 'pw-12345678' });
    await createClass(other, { name: 'Other Class' });

    const { data, error } = await other.rpc('list_class_roster', { p_class_id: fixture.classId });

    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });
});
