import { signIn, signUp } from '../../../lib/auth/service';
import { createClass } from '../../../lib/classes/service';
import { resetDb } from '../../setup/reset-db';
import { makeAnonClient } from '../../setup/supabase-test-client';
import { setupTeacherConsoleFixture, seedCustomActivity } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('create_activity_with_custom_bank', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates a draft + source=custom bank + questions, bound together', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const { activityId, bankId } = await seedCustomActivity(fixture);

    const { data: activity } = await fixture.serviceSb
      .from('activities')
      .select('status, question_bank_id, settings_json')
      .eq('id', activityId)
      .single();
    expect((activity as any).status).toBe('draft');
    expect((activity as any).question_bank_id).toBe(bankId);
    expect((activity as any).settings_json).toMatchObject({
      group_count: 3,
      map_size_target: 60,
      refresh_interval_hours: 12,
    });

    const { data: bank } = await fixture.serviceSb
      .from('question_banks')
      .select('source')
      .eq('id', bankId)
      .single();
    expect((bank as any).source).toBe('custom');

    const { data: questions } = await fixture.serviceSb.from('questions').select('id').eq('bank_id', bankId);
    expect((questions ?? []).length).toBe(20);
  });

  it('rejects a teacher who does not own the class', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const other = makeAnonClient();
    await signUp(other, { email: 'cwcb-other@test.com', password: 'pw-12345678', role: 'teacher' });
    await signIn(other, { email: 'cwcb-other@test.com', password: 'pw-12345678' });
    await createClass(other, { name: 'Other' });

    const { error } = await other.rpc('create_activity_with_custom_bank', {
      p_class_id: fixture.classId,
      p_name: 'X',
      p_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
      p_group_count: 3,
      p_map_size_target: 60,
      p_refresh_interval_hours: 12,
      p_bank_name: 'b',
      p_rows: [{ prompt: 'a', correct_answer: 'b', meta: { part_of_speech: 'n.' } }],
    });

    expect(error?.message).toContain('NOT_CLASS_OWNER');
  });

  it('rejects malformed rows', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const { error } = await fixture.teacherSb.rpc('create_activity_with_custom_bank', {
      p_class_id: fixture.classId,
      p_name: 'X',
      p_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
      p_group_count: 3,
      p_map_size_target: 60,
      p_refresh_interval_hours: 12,
      p_bank_name: 'b',
      p_rows: [{ prompt: '', correct_answer: 'b', meta: {} }],
    });

    expect(error?.message).toContain('INVALID_CUSTOM_BANK_ROWS');
  });

  it('rejects empty rows', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const { error } = await fixture.teacherSb.rpc('create_activity_with_custom_bank', {
      p_class_id: fixture.classId,
      p_name: 'X',
      p_ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
      p_group_count: 3,
      p_map_size_target: 60,
      p_refresh_interval_hours: 12,
      p_bank_name: 'b',
      p_rows: [],
    });

    expect(error?.message).toContain('INVALID_CUSTOM_BANK_ROWS');
  });
});
