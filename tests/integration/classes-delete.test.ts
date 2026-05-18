import { deleteClass } from '../../lib/classes/service';
import { resetDb } from '../setup/reset-db';
import { setupTeacherConsoleFixture, seedCustomActivity } from './teacher-console/helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

async function countRows(serviceSb: any, table: string, column: string, value: string) {
  const { count } = await serviceSb.from(table).select('*', { count: 'exact', head: true }).eq(column, value);
  return count ?? 0;
}

describeIntegration('deleteClass', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('cleans up custom-bank activities without orphaning banks or questions', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const { activityId, bankId } = await seedCustomActivity(fixture);

    await deleteClass(fixture.teacherSb, fixture.classId);

    expect(await countRows(fixture.serviceSb, 'classes', 'id', fixture.classId)).toBe(0);
    expect(await countRows(fixture.serviceSb, 'activities', 'id', activityId)).toBe(0);
    expect(await countRows(fixture.serviceSb, 'question_banks', 'id', bankId)).toBe(0);
    expect(await countRows(fixture.serviceSb, 'questions', 'bank_id', bankId)).toBe(0);
  });
});
