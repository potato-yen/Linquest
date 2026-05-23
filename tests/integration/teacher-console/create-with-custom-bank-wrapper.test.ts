import { createActivityWithCustomBank } from '../../../lib/teacher-console/service';
import { resetDb } from '../../setup/reset-db';
import { setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('createActivityWithCustomBank (wrapper)', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates a draft bound to a source=custom bank', async () => {
    const f = await setupTeacherConsoleFixture();
    const activityId = await createActivityWithCustomBank(f.teacherSb, {
      class_id: f.classId,
      name: 'Wrapper Act',
      ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
      group_count: 3,
      map_size_target: 60,
      refresh_interval_hours: 12,
      bank_name: 'wrapper-bank',
      rows: Array.from({ length: 20 }, (_, i) => ({
        prompt: `p${i}`,
        correct_answer: `a${i}`,
        meta: { part_of_speech: 'n.' },
      })),
    });
    const { data: act } = await f.serviceSb
      .from('activities')
      .select('status, question_bank_id')
      .eq('id', activityId)
      .single();
    expect((act as any).status).toBe('draft');
    const { data: bank } = await f.serviceSb
      .from('question_banks')
      .select('source')
      .eq('id', (act as any).question_bank_id)
      .single();
    expect((bank as any).source).toBe('custom');
  });

  it('maps malformed rows to INVALID_CUSTOM_BANK_ROWS', async () => {
    const f = await setupTeacherConsoleFixture();
    await expect(
      createActivityWithCustomBank(f.teacherSb, {
        class_id: f.classId,
        name: 'X',
        ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
        group_count: 3,
        map_size_target: 60,
        refresh_interval_hours: 12,
        bank_name: 'b',
        rows: [{ prompt: '', correct_answer: 'a', meta: {} }],
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CUSTOM_BANK_ROWS' });
  });
});
