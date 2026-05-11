import {
  endActivityNow,
  getActivitySettlement,
} from '../../../lib/teacher-console/service';
import { resetDb } from '../../setup/reset-db';
import { createPublishedActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console settlement', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns rankings plus analytics after the activity ends', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);

    const { data: questions } = await fixture.serviceSb
      .from('questions')
      .select('id')
      .eq('bank_id', fixture.bankId)
      .limit(1);

    await fixture.serviceSb.from('attempts').insert([
      {
        user_id: fixture.studentIds[0],
        question_id: questions![0].id,
        activity_id: activityId,
        context: 'territory',
        is_correct: false,
        response_ms: 1400,
      },
    ]);

    await endActivityNow(fixture.teacherSb, activityId);

    const settlement = await getActivitySettlement(fixture.teacherSb, activityId);

    expect(settlement.rankings_treasury).toHaveLength(3);
    expect(settlement.rankings_territory).toHaveLength(3);
    expect(settlement.common_mistakes[0]).toEqual(
      expect.objectContaining({ wrong_count: 1 }),
    );
    expect(settlement.accuracy.overall.attempts).toBe(1);
  });
});
