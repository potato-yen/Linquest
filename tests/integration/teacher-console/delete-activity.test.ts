import { signIn, signUp } from '../../../lib/auth/service';
import { createClass } from '../../../lib/classes/service';
import { publishActivity } from '../../../lib/teacher-console/service';
import { resetDb } from '../../setup/reset-db';
import { makeAnonClient } from '../../setup/supabase-test-client';
import { setupTeacherConsoleFixture, seedCustomActivity } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

async function countRows(serviceSb: any, table: string, column: string, value: string) {
  const { count } = await serviceSb.from(table).select('*', { count: 'exact', head: true }).eq(column, value);
  return count ?? 0;
}

describeIntegration('delete_activity', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('hard-deletes the activity, its territory data, and its custom bank', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const { activityId, bankId } = await seedCustomActivity(fixture);
    await publishActivity(fixture.teacherSb, activityId);

    const { data: tiles } = await fixture.serviceSb
      .from('hex_tiles')
      .select('id, map_id, maps!inner(activity_id)')
      .limit(1);
    expect((tiles ?? []).length).toBeGreaterThan(0);

    const { data: question } = await fixture.serviceSb
      .from('questions')
      .select('id')
      .eq('bank_id', bankId)
      .limit(1)
      .single();
    const { data: group } = await fixture.serviceSb
      .from('groups')
      .select('id')
      .eq('activity_id', activityId)
      .limit(1)
      .single();
    const { error: attemptError } = await fixture.serviceSb.from('attempts').insert({
      user_id: fixture.studentIds[0],
      question_id: (question as { id: string }).id,
      activity_id: activityId,
      context: 'territory',
      tile_id: (tiles![0] as { id: string }).id,
      is_correct: true,
      response_ms: 1000,
    });
    expect(attemptError).toBeNull();

    const { error: eventError } = await fixture.serviceSb.from('territory_events').insert({
      activity_id: activityId,
      tile_id: (tiles![0] as { id: string }).id,
      group_id: (group as { id: string }).id,
      user_id: fixture.studentIds[0],
      event_type: 'capture',
      score_delta: 1,
    });
    expect(eventError).toBeNull();

    const { error } = await fixture.teacherSb.rpc('delete_activity', { p_activity_id: activityId });
    expect(error).toBeNull();

    expect(await countRows(fixture.serviceSb, 'activities', 'id', activityId)).toBe(0);
    expect(await countRows(fixture.serviceSb, 'maps', 'activity_id', activityId)).toBe(0);
    expect(await countRows(fixture.serviceSb, 'groups', 'activity_id', activityId)).toBe(0);
    expect(await countRows(fixture.serviceSb, 'refresh_waves', 'activity_id', activityId)).toBe(0);
    expect(await countRows(fixture.serviceSb, 'territory_events', 'activity_id', activityId)).toBe(0);
    expect(await countRows(fixture.serviceSb, 'attempts', 'activity_id', activityId)).toBe(0);
    expect(await countRows(fixture.serviceSb, 'question_banks', 'id', bankId)).toBe(0);
    expect(await countRows(fixture.serviceSb, 'questions', 'bank_id', bankId)).toBe(0);
  });

  it('leaves roadmap + official banks untouched', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const { activityId } = await seedCustomActivity(fixture);
    await publishActivity(fixture.teacherSb, activityId);

    const beforeOfficial = await countRows(fixture.serviceSb, 'questions', 'bank_id', fixture.bankId);
    const { error } = await fixture.teacherSb.rpc('delete_activity', { p_activity_id: activityId });
    expect(error).toBeNull();
    const afterOfficial = await countRows(fixture.serviceSb, 'questions', 'bank_id', fixture.bankId);

    expect(afterOfficial).toBe(beforeOfficial);
    expect(await countRows(fixture.serviceSb, 'question_banks', 'id', fixture.bankId)).toBe(1);
  });

  it('rejects non-owner and unknown activity', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const { activityId } = await seedCustomActivity(fixture);

    const other = makeAnonClient();
    await signUp(other, { email: 'del-other@test.com', password: 'pw-12345678', role: 'teacher' });
    await signIn(other, { email: 'del-other@test.com', password: 'pw-12345678' });
    await createClass(other, { name: 'Other' });

    const nonOwner = await other.rpc('delete_activity', { p_activity_id: activityId });
    expect(nonOwner.error?.message).toContain('NOT_CLASS_OWNER');

    const unknown = await fixture.teacherSb.rpc('delete_activity', {
      p_activity_id: '00000000-0000-0000-0000-000000000000',
    });
    expect(unknown.error?.message).toContain('ACTIVITY_NOT_FOUND');
  });
});
