import { resetDb } from '../../setup/reset-db';
import { createPublishedActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console auto-end lifecycle tick', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('ends activities whose hard end time has passed', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);

    await fixture.serviceSb
      .from('activities')
      .update({
        ends_at: new Date(Date.now() - 60_000).toISOString(),
      })
      .eq('id', activityId);

    const { error } = await fixture.serviceSb.rpc('tick_activity_lifecycle');
    expect(error).toBeNull();

    const { data: activity } = await fixture.serviceSb
      .from('activities')
      .select('status')
      .eq('id', activityId)
      .single();
    expect(activity?.status).toBe('ended');
  });

  it('ends activities after the sudden-death window expires', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);

    await fixture.serviceSb
      .from('activities')
      .update({
        ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        sudden_death_started_at: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', activityId);

    const { error } = await fixture.serviceSb.rpc('tick_activity_lifecycle');
    expect(error).toBeNull();

    const { data: activity } = await fixture.serviceSb
      .from('activities')
      .select('status')
      .eq('id', activityId)
      .single();
    expect(activity?.status).toBe('ended');
  });
});
