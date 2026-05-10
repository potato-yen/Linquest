import { signIn, signUp } from '../../../lib/auth/service';
import { createClass } from '../../../lib/classes/service';
import { initializeMap } from '../../../lib/territory/generator';
import { makeAnonClient, makeServiceClient } from '../../setup/supabase-test-client';
import { resetDb } from '../../setup/reset-db';

const describeIntegration =
  process.env.SUPABASE_INTEGRATION_TESTS === '1' ? describe : describe.skip;

describeIntegration('territory generator', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates a map, owned capital tiles, and starting treasury', async () => {
    const teacher = makeAnonClient();
    await signUp(teacher, {
      email: 'teacher-generator@test.com',
      password: 'pw-12345678',
      role: 'teacher',
    });
    await signIn(teacher, {
      email: 'teacher-generator@test.com',
      password: 'pw-12345678',
    });

    const classroom = await createClass(teacher, { name: 'Generator 101' });

    const service = makeServiceClient();
    const { data: bank } = await service
      .from('question_banks')
      .insert({ name: 'territory-bank', source: 'official' })
      .select()
      .single();
    const { data: activity } = await service
      .from('activities')
      .insert({
        class_id: classroom.id,
        name: 'Activity A',
        question_bank_id: bank!.id,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 86_400_000).toISOString(),
        status: 'draft',
      })
      .select()
      .single();
    const { data: firstGroup } = await service
      .from('groups')
      .insert({ activity_id: activity!.id, name: 'G1' })
      .select()
      .single();
    const { data: secondGroup } = await service
      .from('groups')
      .insert({ activity_id: activity!.id, name: 'G2' })
      .select()
      .single();

    const result = await initializeMap(service, {
      activity_id: activity!.id,
      groups: [
        { group_id: firstGroup!.id, member_count: 5 },
        { group_id: secondGroup!.id, member_count: 6 },
      ],
    });

    expect(result.tile_count).toBeGreaterThanOrEqual(70);

    const { data: tiles } = await service.from('hex_tiles').select('*').eq('map_id', result.map_id);
    expect(tiles).toHaveLength(result.tile_count);
    expect(tiles!.filter((tile) => tile.is_capital)).toHaveLength(11);

    const { data: groups } = await service
      .from('groups')
      .select('treasury, capital_seed_q, capital_seed_r')
      .in('id', [firstGroup!.id, secondGroup!.id]);
    expect(groups!.find((group) => group.treasury === 125)).toBeDefined();
    expect(groups!.find((group) => group.treasury === 150)).toBeDefined();
    expect(groups!.every((group) => group.capital_seed_q !== null && group.capital_seed_r !== null)).toBe(true);
  });
});
