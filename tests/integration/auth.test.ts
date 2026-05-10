import { getCurrentUser, signIn, signOut, signUp } from '../../lib/auth/service';
import { makeAnonClient, makeServiceClient } from '../setup/supabase-test-client';
import { resetDb } from '../setup/reset-db';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('auth service', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('signUp creates an auth user and a profile row', async () => {
    const sb = makeAnonClient();
    const result = await signUp(sb, {
      email: 'alice@test.com',
      password: 'pw-12345678',
      display_name: 'Alice',
      role: 'student',
    });

    expect(result.user_id).toBeDefined();

    const svc = makeServiceClient();
    const { data } = await svc.from('users').select('*').eq('id', result.user_id).single();

    expect(data?.email).toBe('alice@test.com');
    expect(data?.role).toBe('student');
    expect(data?.display_name).toBe('Alice');
  });

  it('signIn returns a session for an existing account', async () => {
    const sb = makeAnonClient();
    await signUp(sb, {
      email: 'bob@test.com',
      password: 'pw-12345678',
      role: 'teacher',
    });

    const session = await signIn(sb, {
      email: 'bob@test.com',
      password: 'pw-12345678',
    });

    expect(session?.access_token).toBeDefined();
  });

  it('getCurrentUser returns profile for an authenticated session', async () => {
    const sb = makeAnonClient();
    await signUp(sb, {
      email: 'carol@test.com',
      password: 'pw-12345678',
      role: 'teacher',
    });

    await signIn(sb, {
      email: 'carol@test.com',
      password: 'pw-12345678',
    });

    const me = await getCurrentUser(sb);

    expect(me?.email).toBe('carol@test.com');
    expect(me?.role).toBe('teacher');
  });

  it('signOut clears the session', async () => {
    const sb = makeAnonClient();
    await signUp(sb, {
      email: 'dan@test.com',
      password: 'pw-12345678',
    });

    await signOut(sb);

    const me = await getCurrentUser(sb);
    expect(me).toBeNull();
  });
});
