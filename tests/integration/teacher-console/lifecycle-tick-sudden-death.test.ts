import { resetDb } from '../../setup/reset-db';
import { createPublishedActivity, setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console sudden-death lifecycle tick', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('writes sudden_death_started_at once when no neutral non-capital tiles remain', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const activityId = await createPublishedActivity(fixture);

    const { data: groups } = await fixture.serviceSb
      .from('groups')
      .select('id')
      .eq('activity_id', activityId)
      .limit(1);
    const ownerGroupId = groups![0].id;

    const { data: activity } = await fixture.serviceSb
      .from('activities')
      .select('map_id, sudden_death_started_at')
      .eq('id', activityId)
      .single();
    expect(activity?.sudden_death_started_at).toBeNull();

    await fixture.serviceSb
      .from('hex_tiles')
      .update({ owner_group_id: ownerGroupId })
      .eq('map_id', activity!.map_id)
      .eq('is_capital', false)
      .is('owner_group_id', null);

    const { error } = await fixture.serviceSb.rpc('tick_activity_lifecycle');
    expect(error).toBeNull();

    const { data: afterFirstTick } = await fixture.serviceSb
      .from('activities')
      .select('sudden_death_started_at')
      .eq('id', activityId)
      .single();
    expect(afterFirstTick?.sudden_death_started_at).not.toBeNull();

    const firstValue = afterFirstTick!.sudden_death_started_at;
    await fixture.serviceSb.rpc('tick_activity_lifecycle');

    const { data: afterSecondTick } = await fixture.serviceSb
      .from('activities')
      .select('sudden_death_started_at')
      .eq('id', activityId)
      .single();
    expect(afterSecondTick?.sudden_death_started_at).toBe(firstValue);
  });
});
