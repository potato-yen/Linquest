import { SupabaseClient } from '@supabase/supabase-js';
import { signIn, signUp } from '../../../lib/auth/service';
import { createClass } from '../../../lib/classes/service';
import { initializeMap } from '../../../lib/territory/generator';
import { makeAnonClient, makeServiceClient } from '../../setup/supabase-test-client';

const ADJACENT_STEPS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
] as const;

export interface TwoGroupFixture {
  svc: SupabaseClient;
  attackerSb: SupabaseClient;
  defenderSb: SupabaseClient;
  activity_id: string;
  map_id: string;
  attackerGroupId: string;
  defenderGroupId: string;
  attackerCredentials: { email: string; password: string };
  defenderCredentials: { email: string; password: string };
  getTreasury(groupId: string): Promise<number>;
  getOwnedTiles(groupId: string): Promise<Array<{ id: string; q: number; r: number; is_capital: boolean }>>;
  findAdjacentNeutralForGroup(groupId: string): Promise<{ id: string; q: number; r: number; is_capital: boolean }>;
  findFarNeutralForGroup(groupId: string): Promise<{ id: string; q: number; r: number; is_capital: boolean }>;
  makeAdjacentEnemyTileForAttacker(): Promise<{ id: string; q: number; r: number; is_capital: boolean }>;
  makeAdjacentMultiplierTileForAttacker(multiplier: 2 | 3, ownerGroupId?: string | null): Promise<{ id: string; q: number; r: number; is_capital: boolean }>;
}

export async function setupTwoGroupFixture(): Promise<TwoGroupFixture> {
  const teacherSb = makeAnonClient();
  await signUp(teacherSb, {
    email: 'teacher-territory@test.com',
    password: 'pw-12345678',
    role: 'teacher',
  });
  await signIn(teacherSb, {
    email: 'teacher-territory@test.com',
    password: 'pw-12345678',
  });
  const classroom = await createClass(teacherSb, { name: 'Territory Class' });

  const attackerCredentials = {
    email: 'attacker@test.com',
    password: 'pw-12345678',
  };
  const attackerSb = makeAnonClient();
  await signUp(attackerSb, {
    email: attackerCredentials.email,
    password: attackerCredentials.password,
    role: 'student',
  });
  await signIn(attackerSb, attackerCredentials);
  const attackerId = (await attackerSb.auth.getSession()).data.session!.user.id;

  const defenderCredentials = {
    email: 'defender@test.com',
    password: 'pw-12345678',
  };
  const defenderSb = makeAnonClient();
  await signUp(defenderSb, {
    email: defenderCredentials.email,
    password: defenderCredentials.password,
    role: 'student',
  });
  await signIn(defenderSb, defenderCredentials);
  const defenderId = (await defenderSb.auth.getSession()).data.session!.user.id;

  const svc = makeServiceClient();
  await svc.from('class_members').insert([
    { class_id: classroom.id, user_id: attackerId },
    { class_id: classroom.id, user_id: defenderId },
  ]);
  const { data: bank } = await svc
    .from('question_banks')
    .insert({ name: 'territory-fixture-bank', source: 'official' })
    .select()
    .single();
  const { data: activity } = await svc
    .from('activities')
    .insert({
      class_id: classroom.id,
      name: 'Fixture Activity',
      question_bank_id: bank!.id,
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3_600_000).toISOString(),
      status: 'active',
    })
    .select()
    .single();
  const { data: attackerGroup } = await svc
    .from('groups')
    .insert({ activity_id: activity!.id, name: 'Attackers' })
    .select()
    .single();
  const { data: defenderGroup } = await svc
    .from('groups')
    .insert({ activity_id: activity!.id, name: 'Defenders' })
    .select()
    .single();
  await svc.from('group_members').insert([
    { group_id: attackerGroup!.id, user_id: attackerId },
    { group_id: defenderGroup!.id, user_id: defenderId },
  ]);

  const initialized = await initializeMap(svc, {
    activity_id: activity!.id,
    groups: [
      { group_id: attackerGroup!.id, member_count: 1 },
      { group_id: defenderGroup!.id, member_count: 1 },
    ],
  });

  async function getTreasury(groupId: string): Promise<number> {
    const { data } = await svc
      .from('groups')
      .select('treasury')
      .eq('id', groupId)
      .single();
    return data!.treasury as number;
  }

  async function getOwnedTiles(groupId: string) {
    const { data } = await svc
      .from('hex_tiles')
      .select('id, q, r, is_capital')
      .eq('map_id', initialized.map_id)
      .eq('owner_group_id', groupId);
    return data ?? [];
  }

  async function getAllTiles() {
    const { data } = await svc
      .from('hex_tiles')
      .select('id, q, r, is_capital, owner_group_id')
      .eq('map_id', initialized.map_id);
    return data ?? [];
  }

  async function findAdjacentNeutralForGroup(groupId: string) {
    const owned = await getOwnedTiles(groupId);
    const allTiles = await getAllTiles();

    for (const tile of allTiles) {
      if (tile.owner_group_id !== null || tile.is_capital) {
        continue;
      }

      if (owned.some((ownedTile) => isNeighbor(ownedTile, tile))) {
        return tile;
      }
    }

    throw new Error('no adjacent neutral tile found');
  }

  async function findFarNeutralForGroup(groupId: string) {
    const owned = await getOwnedTiles(groupId);
    const allTiles = await getAllTiles();

    for (const tile of allTiles) {
      if (tile.owner_group_id !== null || tile.is_capital) {
        continue;
      }

      if (owned.every((ownedTile) => !isNeighbor(ownedTile, tile))) {
        return tile;
      }
    }

    throw new Error('no non-adjacent neutral tile found');
  }

  async function makeAdjacentEnemyTileForAttacker() {
    const target = await findAdjacentNeutralForGroup(attackerGroup!.id);
    await svc
      .from('hex_tiles')
      .update({
        owner_group_id: defenderGroup!.id,
        kind: 'normal',
        multiplier: null,
        is_capital: false,
      })
      .eq('id', target.id);

    return target;
  }

  async function makeAdjacentMultiplierTileForAttacker(
    multiplier: 2 | 3,
    ownerGroupId: string | null = null,
  ) {
    const target = await findAdjacentNeutralForGroup(attackerGroup!.id);
    await svc
      .from('hex_tiles')
      .update({
        owner_group_id: ownerGroupId,
        kind: 'multiplier',
        multiplier,
        is_capital: false,
      })
      .eq('id', target.id);

    return target;
  }

  return {
    svc,
    attackerSb,
    defenderSb,
    activity_id: activity!.id,
    map_id: initialized.map_id,
    attackerGroupId: attackerGroup!.id,
    defenderGroupId: defenderGroup!.id,
    attackerCredentials,
    defenderCredentials,
    getTreasury,
    getOwnedTiles,
    findAdjacentNeutralForGroup,
    findFarNeutralForGroup,
    makeAdjacentEnemyTileForAttacker,
    makeAdjacentMultiplierTileForAttacker,
  };
}

function isNeighbor(
  left: { q: number; r: number },
  right: { q: number; r: number },
): boolean {
  const dq = right.q - left.q;
  const dr = right.r - left.r;
  return ADJACENT_STEPS.some(([q, r]) => q === dq && r === dr);
}
