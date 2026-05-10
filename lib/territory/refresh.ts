import { SupabaseClient } from '@supabase/supabase-js';
import { pickRefreshTargets } from './refresh-policy';
import { HexTile, TERRITORY_DEFAULTS, TerritoryParams } from './types';

export async function runRefreshWave(
  sb: SupabaseClient,
  activity_id: string,
  paramsOverride?: Partial<TerritoryParams>,
): Promise<{ wave_id: string }> {
  const params = { ...TERRITORY_DEFAULTS, ...(paramsOverride ?? {}) };
  const { data: activity, error: activityError } = await sb
    .from('activities')
    .select('map_id')
    .eq('id', activity_id)
    .single();

  if (activityError || !activity?.map_id) {
    throw activityError ?? new Error('activity has no map');
  }

  const { data: tiles, error: tilesError } = await sb
    .from('hex_tiles')
    .select('*')
    .eq('map_id', activity.map_id);

  if (tilesError || !tiles) {
    throw tilesError ?? new Error('tiles not found');
  }

  const previousSpecialIds = (tiles as HexTile[])
    .filter((tile) => tile.kind === 'special')
    .map((tile) => tile.id);
  const pick = pickRefreshTargets(tiles as HexTile[], previousSpecialIds, params);
  const { data, error } = await sb.rpc('run_refresh_wave', {
    p_activity_id: activity_id,
    p_multiplier_targets: pick.multiplier_targets.map((target) => ({
      tile_id: target.tile.id,
      multiplier: target.multiplier,
    })),
    p_special_targets: pick.special_targets.map((target) => target.id),
    p_policy: pick.policy,
    p_previous_special_tile_ids: previousSpecialIds,
    p_refresh_interval_seconds: params.refresh_interval_hours * 3600,
  });

  if (error) {
    throw error;
  }

  return { wave_id: data as string };
}
