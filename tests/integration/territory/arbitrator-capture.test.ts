import { signIn, signUp } from '../../../lib/auth/service';
import { createClass } from '../../../lib/classes/service';
import { attemptCapture, resolveChallenge } from '../../../lib/territory/arbitrator';
import { initializeMap } from '../../../lib/territory/generator';
import { makeAnonClient, makeServiceClient } from '../../setup/supabase-test-client';
import { resetDb } from '../../setup/reset-db';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory arbitrator capture flow', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('captures an adjacent neutral tile and updates treasury + owner', async () => {
    const fixture = await setupSingleGroupFixture();
    const before = await fixture.getTreasury();
    const capture = await attemptCapture(fixture.studentSb, {
      activity_id: fixture.activityId,
      tile_id: fixture.adjacentNeutral.id,
    });

    expect(capture.spec.kind).toBe('capture_normal');
    expect(capture.spec.cost).toBe(10);

    await resolveChallenge(fixture.studentSb, {
      activity_id: fixture.activityId,
      challenge_id: capture.challenge_id,
      tile_id: fixture.adjacentNeutral.id,
      kind: capture.spec.kind,
      all_correct: true,
      spec: capture.spec,
    });

    const after = await fixture.getTreasury();
    expect(after - before).toBe(6);

    const { data: tile } = await fixture.service
      .from('hex_tiles')
      .select('owner_group_id, protected_until')
      .eq('id', fixture.adjacentNeutral.id)
      .single();
    expect(tile!.owner_group_id).toBe(fixture.groupId);
    expect(tile!.protected_until).not.toBeNull();
  });

  it('rejects a non-adjacent tile', async () => {
    const fixture = await setupSingleGroupFixture();

    await expect(
      attemptCapture(fixture.studentSb, {
        activity_id: fixture.activityId,
        tile_id: fixture.farNeutral.id,
      }),
    ).rejects.toMatchObject({ code: 'NOT_ADJACENT' });
  });

  it('rejects when treasury is insufficient without charging the group', async () => {
    const fixture = await setupSingleGroupFixture();
    await fixture.service.from('groups').update({ treasury: 5 }).eq('id', fixture.groupId);

    await expect(
      attemptCapture(fixture.studentSb, {
        activity_id: fixture.activityId,
        tile_id: fixture.adjacentNeutral.id,
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_TREASURY' });

    expect(await fixture.getTreasury()).toBe(5);
  });
});

async function setupSingleGroupFixture() {
  const teacher = makeAnonClient();
  await signUp(teacher, {
    email: 'teacher-single@test.com',
    password: 'pw-12345678',
    role: 'teacher',
  });
  await signIn(teacher, {
    email: 'teacher-single@test.com',
    password: 'pw-12345678',
  });
  const classroom = await createClass(teacher, { name: 'Capture Class' });

  const studentSb = makeAnonClient();
  await signUp(studentSb, {
    email: 'student-single@test.com',
    password: 'pw-12345678',
    role: 'student',
  });
  await signIn(studentSb, {
    email: 'student-single@test.com',
    password: 'pw-12345678',
  });
  const studentId = (await studentSb.auth.getSession()).data.session!.user.id;

  const service = makeServiceClient();
  await service.from('class_members').insert({ class_id: classroom.id, user_id: studentId });
  const { data: bank } = await service
    .from('question_banks')
    .insert({ name: 'capture-bank', source: 'official' })
    .select()
    .single();
  const { data: activity } = await service
    .from('activities')
    .insert({
      class_id: classroom.id,
      name: 'Capture Activity',
      question_bank_id: bank!.id,
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3_600_000).toISOString(),
      status: 'active',
    })
    .select()
    .single();
  const { data: group } = await service
    .from('groups')
    .insert({ activity_id: activity!.id, name: 'Solo Group' })
    .select()
    .single();
  await service.from('group_members').insert({ group_id: group!.id, user_id: studentId });
  const initialized = await initializeMap(service, {
    activity_id: activity!.id,
    groups: [{ group_id: group!.id, member_count: 1 }],
  });

  const { data: ownedTiles } = await service
    .from('hex_tiles')
    .select('q, r')
    .eq('map_id', initialized.map_id)
    .eq('owner_group_id', group!.id);
  const { data: allTiles } = await service
    .from('hex_tiles')
    .select('id, q, r, is_capital, owner_group_id')
    .eq('map_id', initialized.map_id);
  const steps = [
    [1, 0],
    [1, -1],
    [0, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
  ];
  const adjacentNeutral = allTiles!.find((tile) =>
    tile.owner_group_id === null &&
    !tile.is_capital &&
    ownedTiles!.some((owned) =>
      steps.some(([q, r]) => tile.q - owned.q === q && tile.r - owned.r === r),
    ),
  )!;
  const farNeutral = allTiles!.find((tile) =>
    tile.owner_group_id === null &&
    !tile.is_capital &&
    ownedTiles!.every((owned) =>
      !steps.some(([q, r]) => tile.q - owned.q === q && tile.r - owned.r === r),
    ),
  )!;

  return {
    service,
    studentSb,
    activityId: activity!.id,
    groupId: group!.id,
    adjacentNeutral,
    farNeutral,
    async getTreasury() {
      const { data } = await service.from('groups').select('treasury').eq('id', group!.id).single();
      return data!.treasury as number;
    },
  };
}
