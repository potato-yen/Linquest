import { signIn, signUp } from '../../../lib/auth/service';
import { createClass } from '../../../lib/classes/service';
import { resetDb } from '../../setup/reset-db';
import { makeAnonClient } from '../../setup/supabase-test-client';
import { setupTeacherConsoleFixture, seedCustomActivity, signInStudent } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('custom bank question read access', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('lets a class member read the activity custom-bank questions', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const { bankId } = await seedCustomActivity(fixture);

    const studentSb = await signInStudent(fixture, 0);
    const { data, error } = await studentSb.from('questions').select('id').eq('bank_id', bankId);

    expect(error).toBeNull();
    expect((data ?? []).length).toBe(8);
  });

  it('denies a member of another class from reading custom questions', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const { bankId } = await seedCustomActivity(fixture);

    const otherTeacher = makeAnonClient();
    await signUp(otherTeacher, {
      email: 'custom-rls-other-teacher@test.com',
      password: 'pw-12345678',
      role: 'teacher',
    });
    await signIn(otherTeacher, {
      email: 'custom-rls-other-teacher@test.com',
      password: 'pw-12345678',
    });
    const otherClass = await createClass(otherTeacher, { name: 'Other Class' });

    const outsider = makeAnonClient();
    await signUp(outsider, {
      email: 'custom-rls-outsider@test.com',
      password: 'pw-12345678',
      role: 'student',
    });
    await signIn(outsider, { email: 'custom-rls-outsider@test.com', password: 'pw-12345678' });
    const {
      data: { session },
    } = await outsider.auth.getSession();
    await fixture.serviceSb.from('class_members').insert({
      class_id: otherClass.id,
      user_id: session!.user.id,
    });

    const { data, error } = await outsider.from('questions').select('id').eq('bank_id', bankId);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });

  it('does not change official-bank read behaviour', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const studentSb = await signInStudent(fixture, 0);
    const { data, error } = await studentSb.from('questions').select('id').eq('bank_id', fixture.bankId);

    expect(error).toBeNull();
    expect((data ?? []).length).toBe(60);
  });
});
