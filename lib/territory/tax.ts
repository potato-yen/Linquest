import { SupabaseClient } from '@supabase/supabase-js';
import { TERRITORY_DEFAULTS, TerritoryParams } from './types';

export async function runTaxTick(
  sb: SupabaseClient,
  activity_id: string,
  paramsOverride?: Partial<TerritoryParams>,
): Promise<void> {
  const params = { ...TERRITORY_DEFAULTS, ...(paramsOverride ?? {}) };
  const { error } = await sb.rpc('run_tax_tick', {
    p_activity_id: activity_id,
    p_base_rate: params.tax_per_owned_tile_per_hour,
    p_relief_threshold: params.relief_threshold_treasury,
  });

  if (error) {
    throw error;
  }
}
