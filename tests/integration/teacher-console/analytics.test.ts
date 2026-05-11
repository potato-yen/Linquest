import {
  getActivityAccuracy,
  getActivityCommonMistakes,
} from '../../../lib/teacher-console/service';
import { resetDb } from '../../setup/reset-db';
import { createPublishedActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console analytics', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('returns top mistakes and accuracy rollups for an activity', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);

    const { data: questions } = await fixture.serviceSb
      .from('questions')
      .select('id, prompt')
      .eq('bank_id', fixture.bankId)
      .limit(3);

    await fixture.serviceSb.from('attempts').insert([
      {
        user_id: fixture.studentIds[0],
        question_id: questions![0].id,
        activity_id: activityId,
        context: 'territory',
        is_correct: false,
        response_ms: 1200,
      },
      {
        user_id: fixture.studentIds[1],
        question_id: questions![0].id,
        activity_id: activityId,
        context: 'territory',
        is_correct: false,
        response_ms: 1300,
      },
      {
        user_id: fixture.studentIds[2],
        question_id: questions![1].id,
        activity_id: activityId,
        context: 'battle',
        is_correct: true,
        response_ms: 900,
      },
      {
        user_id: fixture.studentIds[3],
        question_id: questions![2].id,
        activity_id: activityId,
        context: 'territory',
        is_correct: true,
        response_ms: 800,
      },
    ]);

    const mistakes = await getActivityCommonMistakes(fixture.teacherSb, activityId, 3);
    const accuracy = await getActivityAccuracy(fixture.teacherSb, activityId);

    expect(mistakes[0]).toEqual(
      expect.objectContaining({
        question_id: questions![0].id,
        wrong_count: 2,
      }),
    );
    expect(accuracy.overall.attempts).toBe(4);
    expect(accuracy.overall.correct).toBe(2);
    expect(accuracy.by_context.territory.attempts).toBe(3);
    expect(accuracy.by_context.battle.attempts).toBe(1);
  });
});
