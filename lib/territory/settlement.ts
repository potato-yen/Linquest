import { SupabaseClient } from '@supabase/supabase-js';

export interface TreasuryLeaderboardRow {
  group_id: string;
  group_name: string;
  treasury: number;
}

export interface TerritoryLeaderboardRow {
  group_id: string;
  group_name: string;
  owned_count: number;
}

export interface Leaderboards {
  treasury: TreasuryLeaderboardRow[];
  territory: TerritoryLeaderboardRow[];
}

export async function endActivity(
  sb: SupabaseClient,
  activity_id: string,
): Promise<void> {
  const { error } = await sb.rpc('settle_activity', {
    p_activity_id: activity_id,
  });

  if (error) {
    throw error;
  }
}

export async function getLeaderboards(
  sb: SupabaseClient,
  activity_id: string,
): Promise<Leaderboards> {
  const { data: activity, error: activityError } = await sb
    .from('activities')
    .select('map_id')
    .eq('id', activity_id)
    .single();

  if (activityError || !activity?.map_id) {
    throw activityError ?? new Error('activity has no map');
  }

  const [{ data: groups, error: groupsError }, { data: tiles, error: tilesError }] = await Promise.all([
    sb.from('groups').select('id, name, treasury').eq('activity_id', activity_id),
    sb.from('hex_tiles').select('owner_group_id').eq('map_id', activity.map_id).not('owner_group_id', 'is', null),
  ]);

  if (groupsError) {
    throw groupsError;
  }

  if (tilesError) {
    throw tilesError;
  }

  const counts = new Map<string, number>();
  for (const tile of tiles ?? []) {
    counts.set(tile.owner_group_id as string, (counts.get(tile.owner_group_id as string) ?? 0) + 1);
  }

  const treasury = (groups ?? [])
    .map((group) => ({
      group_id: group.id,
      group_name: group.name,
      treasury: group.treasury,
    }))
    .sort((left, right) => right.treasury - left.treasury);
  const territory = (groups ?? [])
    .map((group) => ({
      group_id: group.id,
      group_name: group.name,
      owned_count: counts.get(group.id) ?? 0,
    }))
    .sort((left, right) => right.owned_count - left.owned_count);

  return { treasury, territory };
}
