import { SupabaseClient } from '@supabase/supabase-js';
import { axialToString, bfsFrom, distance, neighbors } from './coords';
import { generateShape, mapDiameter } from './shape';
import { AxialCoord, TERRITORY_DEFAULTS, TerritoryParams } from './types';

export interface GroupSpawnInput {
  group_id: string;
  member_count: number;
}

export interface GroupSpawnPlan {
  group_id: string;
  capital_seed: AxialCoord;
  capital: AxialCoord[];
  regular: AxialCoord[];
}

export type GroupSpawnResult =
  | { success: true; spawns: GroupSpawnPlan[] }
  | { success: false; reason: string };

export interface InitializeMapInput {
  activity_id: string;
  groups: GroupSpawnInput[];
  params?: Partial<TerritoryParams>;
}

export async function initializeMap(
  sb: SupabaseClient,
  input: InitializeMapInput,
): Promise<{ map_id: string; tile_count: number }> {
  const params = { ...TERRITORY_DEFAULTS, ...(input.params ?? {}) };
  const coords = generateShape(params.map_size_target);
  const plan = planAllGroupSpawns(coords, input.groups, params);

  if (!plan.success) {
    throw new Error(plan.reason);
  }

  const bounds = coords.reduce(
    (acc, coord) => ({
      minQ: Math.min(acc.minQ, coord.q),
      maxQ: Math.max(acc.maxQ, coord.q),
      minR: Math.min(acc.minR, coord.r),
      maxR: Math.max(acc.maxR, coord.r),
    }),
    { minQ: 0, maxQ: 0, minR: 0, maxR: 0 },
  );

  const { data: mapRow, error: mapError } = await sb
    .from('maps')
    .insert({
      activity_id: input.activity_id,
      width: bounds.maxQ - bounds.minQ + 1,
      height: bounds.maxR - bounds.minR + 1,
      tile_layout_json: { count: coords.length },
    })
    .select()
    .single();

  if (mapError) {
    throw mapError;
  }

  const owners = new Map<string, string>();
  const capitals = new Set<string>();

  for (const spawn of plan.spawns) {
    for (const coord of spawn.capital) {
      const key = axialToString(coord);
      owners.set(key, spawn.group_id);
      capitals.add(key);
    }

    for (const coord of spawn.regular) {
      owners.set(axialToString(coord), spawn.group_id);
    }
  }

  const tileRows = coords.map((coord) => ({
    map_id: mapRow.id,
    q: coord.q,
    r: coord.r,
    kind: 'normal',
    multiplier: null,
    owner_group_id: owners.get(axialToString(coord)) ?? null,
    is_capital: capitals.has(axialToString(coord)),
  }));

  for (let index = 0; index < tileRows.length; index += 200) {
    const { error } = await sb.from('hex_tiles').insert(tileRows.slice(index, index + 200));
    if (error) {
      throw error;
    }
  }

  const { error: activityError } = await sb
    .from('activities')
    .update({ map_id: mapRow.id })
    .eq('id', input.activity_id);
  if (activityError) {
    throw activityError;
  }

  for (const spawn of plan.spawns) {
    const startingTreasury = input.groups.find((group) => group.group_id === spawn.group_id)!.member_count
      * params.treasury_starting_per_member;
    const { error } = await sb
      .from('groups')
      .update({
        treasury: startingTreasury,
        capital_seed_q: spawn.capital_seed.q,
        capital_seed_r: spawn.capital_seed.r,
      })
      .eq('id', spawn.group_id);

    if (error) {
      throw error;
    }
  }

  return { map_id: mapRow.id, tile_count: coords.length };
}

export function planCapital(
  seed: AxialCoord,
  capitalSize: number,
  tiles: AxialCoord[],
): AxialCoord[] {
  const tileSet = new Set(tiles.map(axialToString));
  return bfsFrom(seed, capitalSize, (coord) => tileSet.has(axialToString(coord)));
}

export function planRegularInitial(
  capital: AxialCoord[],
  count: number,
  tiles: AxialCoord[],
): AxialCoord[] {
  if (count <= 0) {
    return [];
  }

  const tileSet = new Set(tiles.map(axialToString));
  const capitalSet = new Set(capital.map(axialToString));
  const queue: AxialCoord[] = [];
  const seen = new Set<string>();
  const selected: AxialCoord[] = [];

  for (const coord of capital) {
    for (const next of neighbors(coord)) {
      const key = axialToString(next);
      if (tileSet.has(key) && !capitalSet.has(key) && !seen.has(key)) {
        queue.push(next);
        seen.add(key);
      }
    }
  }

  while (queue.length > 0 && selected.length < count) {
    const current = queue.shift()!;
    selected.push(current);

    for (const next of neighbors(current)) {
      const key = axialToString(next);
      if (!tileSet.has(key) || capitalSet.has(key) || seen.has(key)) {
        continue;
      }

      queue.push(next);
      seen.add(key);
    }
  }

  return selected;
}

export function planAllGroupSpawns(
  tiles: AxialCoord[],
  groups: GroupSpawnInput[],
  params: TerritoryParams,
  rng: () => number = Math.random,
): GroupSpawnResult {
  const diameter = mapDiameter(tiles);
  const minDistance = Math.floor(diameter * params.min_inter_capital_distance_factor);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const occupied = new Set<string>();
    const seeds: AxialCoord[] = [];
    const spawns: GroupSpawnPlan[] = [];
    let failed = false;

    for (const group of groups) {
      const totalInitial = Math.ceil(group.member_count * params.initial_territory_per_member_factor);
      const regularCount = totalInitial - group.member_count;
      const availableTiles = tiles.filter((tile) => !occupied.has(axialToString(tile)));
      const candidateSeeds = availableTiles.filter((tile) =>
        seeds.every((seed) => distance(seed, tile) >= minDistance),
      );

      if (candidateSeeds.length === 0) {
        failed = true;
        break;
      }

      const seed = candidateSeeds[Math.floor(rng() * candidateSeeds.length)];
      const capital = planCapital(seed, group.member_count, availableTiles);
      if (capital.length < group.member_count) {
        failed = true;
        break;
      }

      capital.forEach((coord) => occupied.add(axialToString(coord)));

      const regular = planRegularInitial(
        capital,
        regularCount,
        tiles.filter((tile) => !occupied.has(axialToString(tile))),
      );
      if (regular.length < regularCount) {
        failed = true;
        break;
      }

      regular.forEach((coord) => occupied.add(axialToString(coord)));
      seeds.push(seed);
      spawns.push({
        group_id: group.group_id,
        capital_seed: seed,
        capital,
        regular,
      });
    }

    if (!failed) {
      return { success: true, spawns };
    }
  }

  return {
    success: false,
    reason: 'could not place all groups within min-distance constraints',
  };
}
