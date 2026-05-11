import { resetDb } from '../../setup/reset-db';
import { setupTeacherConsoleFixture } from './helpers';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('teacher console draft + publish flow', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates draft activities with null starts_at and no groups or map', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: activityId, error } = await fixture.teacherSb.rpc('create_activity_draft', {
      p_class_id: fixture.classId,
      p_name: 'Teacher Console Draft',
      p_ends_at: endsAt,
      p_question_bank_id: fixture.bankId,
      p_group_count: 3,
      p_map_size_target: 60,
      p_refresh_interval_hours: 12,
    });

    expect(error).toBeNull();
    expect(typeof activityId).toBe('string');

    const { data: activity } = await fixture.serviceSb
      .from('activities')
      .select('id, status, starts_at, map_id, settings_json')
      .eq('id', activityId)
      .single();

    expect(activity?.status).toBe('draft');
    expect(activity?.starts_at).toBeNull();
    expect(activity?.map_id).toBeNull();
    expect(activity?.settings_json).toMatchObject({
      group_count: 3,
      map_size_target: 60,
      refresh_interval_hours: 12,
    });

    const { count: groupCount } = await fixture.serviceSb
      .from('groups')
      .select('*', { head: true, count: 'exact' })
      .eq('activity_id', activityId);
    expect(groupCount).toBe(0);
  });

  it('publishes a draft by snapshotting members, generating a map, and listing effective_end_at', async () => {
    const fixture = await setupTeacherConsoleFixture();
    const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: activityId, error: draftError } = await fixture.teacherSb.rpc('create_activity_draft', {
      p_class_id: fixture.classId,
      p_name: 'Teacher Console Publish',
      p_ends_at: endsAt,
      p_question_bank_id: fixture.bankId,
      p_group_count: 3,
      p_map_size_target: 60,
      p_refresh_interval_hours: 12,
    });

    expect(draftError).toBeNull();

    const teacherConsole = await import('../../../lib/teacher-console/service');
    await teacherConsole.publishActivity(fixture.teacherSb, activityId);

    const { data: published } = await fixture.serviceSb
      .from('activities')
      .select('id, status, starts_at, map_id, next_refresh_at, next_tax_at')
      .eq('id', activityId)
      .single();

    expect(published?.status).toBe('active');
    expect(published?.starts_at).not.toBeNull();
    expect(published?.map_id).not.toBeNull();
    expect(published?.next_refresh_at).not.toBeNull();
    expect(published?.next_tax_at).not.toBeNull();

    const { data: groups } = await fixture.serviceSb
      .from('groups')
      .select('id, capital_seed_q, capital_seed_r')
      .eq('activity_id', activityId);
    expect(groups).toHaveLength(3);
    for (const group of groups ?? []) {
      expect(group.capital_seed_q).not.toBeNull();
      expect(group.capital_seed_r).not.toBeNull();
    }

    const { data: roster } = await fixture.serviceSb
      .from('group_members')
      .select('group_id')
      .in('group_id', (groups ?? []).map((group) => group.id));
    const sizeByGroupId = new Map<string, number>();
    for (const row of roster ?? []) {
      sizeByGroupId.set(row.group_id, (sizeByGroupId.get(row.group_id) ?? 0) + 1);
    }
    const sizes = Array.from(sizeByGroupId.values()).sort((left, right) => left - right);
    expect(sizes).toEqual([2, 2, 2]);

    const { data: tiles } = await fixture.serviceSb
      .from('hex_tiles')
      .select('id, kind, multiplier')
      .eq('map_id', published!.map_id);
    expect((tiles ?? []).length).toBeGreaterThan(50);
    expect((tiles ?? []).some((tile) => tile.kind === 'special')).toBe(true);
    expect((tiles ?? []).some((tile) => tile.kind === 'multiplier')).toBe(true);

    const { data: activities } = await fixture.teacherSb.rpc('list_my_activities', {
      p_class_id: fixture.classId,
    });
    expect(activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: activityId,
          status: 'active',
        }),
      ]),
    );
    expect(activities[0].effective_end_at).not.toBeNull();
  });
});
