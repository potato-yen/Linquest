import { signIn, signUp } from '../../lib/auth/service';
import { createClass, joinByCode, listMyClasses } from '../../lib/classes/service';
import { makeAnonClient } from '../setup/supabase-test-client';
import { resetDb } from '../setup/reset-db';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('classes service', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('teacher creates a class with a unique code', async () => {
    const sb = makeAnonClient();
    await signUp(sb, {
      email: 't@test.com',
      password: 'pw-12345678',
      role: 'teacher',
    });
    await signIn(sb, {
      email: 't@test.com',
      password: 'pw-12345678',
    });

    const createdClass = await createClass(sb, { name: 'English 101' });

    expect(createdClass.class_code).toMatch(/^[A-Z0-9]{6}$/);
    expect(createdClass.name).toBe('English 101');
  });

  it('student joins a class by code', async () => {
    const teacherClient = makeAnonClient();
    await signUp(teacherClient, {
      email: 't@test.com',
      password: 'pw-12345678',
      role: 'teacher',
    });
    await signIn(teacherClient, {
      email: 't@test.com',
      password: 'pw-12345678',
    });

    const createdClass = await createClass(teacherClient, { name: 'English 101' });
    await teacherClient.auth.signOut();

    const studentClient = makeAnonClient();
    await signUp(studentClient, {
      email: 's@test.com',
      password: 'pw-12345678',
      role: 'student',
    });
    await signIn(studentClient, {
      email: 's@test.com',
      password: 'pw-12345678',
    });

    await joinByCode(studentClient, createdClass.class_code);
    const classes = await listMyClasses(studentClient);

    expect(classes.map((item) => item.id)).toContain(createdClass.id);
  });

  it('joinByCode throws on an invalid code', async () => {
    const sb = makeAnonClient();
    await signUp(sb, {
      email: 's@test.com',
      password: 'pw-12345678',
    });
    await signIn(sb, {
      email: 's@test.com',
      password: 'pw-12345678',
    });

    await expect(joinByCode(sb, 'NOPE99')).rejects.toThrow(/not found/i);
  });
});
