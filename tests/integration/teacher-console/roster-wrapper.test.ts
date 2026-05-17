import { listClassRoster } from '../../../lib/classes/service';
import { signIn, signUp } from '../../../lib/auth/service';
import { createClass } from '../../../lib/classes/service';
import { resetDb } from '../../setup/reset-db';
import { makeAnonClient } from '../../setup/supabase-test-client';
import { setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('listClassRoster (wrapper vs pushed RPC)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('owner gets all members', async () => {
    const f = await setupTeacherConsoleFixture();
    const rows = await listClassRoster(f.teacherSb, f.classId);
    expect(rows.map((r) => r.user_id).sort()).toEqual([...f.studentIds].sort());
    expect(rows.every((r) => !!r.joined_at)).toBe(true);
  });

  it('non-owner gets empty', async () => {
    const f = await setupTeacherConsoleFixture();
    const other = makeAnonClient();
    await signUp(other, { email: 'roster-w-other@test.com', password: 'pw-12345678', role: 'teacher' });
    await signIn(other, { email: 'roster-w-other@test.com', password: 'pw-12345678' });
    await createClass(other, { name: 'O' });
    expect(await listClassRoster(other, f.classId)).toEqual([]);
  });
});
