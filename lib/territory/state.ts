import { SupabaseClient } from '@supabase/supabase-js';
import { HexTile } from './types';

export interface ActivityState {
  activity_id: string;
  status: string;
  ends_at: string;
  sudden_death_started_at: string | null;
  next_refresh_at: string | null;
  next_tax_at: string | null;
  groups: Array<{
    id: string;
    name: string;
    color: string;
    treasury: number;
  }>;
  tiles: HexTile[];
}

export async function getActivityState(
  sb: SupabaseClient,
  activity_id: string,
): Promise<ActivityState> {
  const { data: activity, error: activityError } = await sb
    .from('activities')
    .select('id, status, map_id, ends_at, sudden_death_started_at, next_refresh_at, next_tax_at')
    .eq('id', activity_id)
    .single();

  if (activityError || !activity) {
    throw activityError ?? new Error('activity not found');
  }

  const [{ data: groups, error: groupsError }, { data: tiles, error: tilesError }] = await Promise.all([
    sb.from('groups').select('id, name, color, treasury').eq('activity_id', activity_id),
    sb.from('hex_tiles').select('*').eq('map_id', activity.map_id),
  ]);

  if (groupsError) {
    throw groupsError;
  }

  if (tilesError) {
    throw tilesError;
  }

  return {
    activity_id,
    status: activity.status,
    ends_at: activity.ends_at,
    sudden_death_started_at: activity.sudden_death_started_at,
    next_refresh_at: activity.next_refresh_at,
    next_tax_at: activity.next_tax_at,
    groups: (groups ?? []) as ActivityState['groups'],
    tiles: (tiles ?? []) as HexTile[],
  };
}
