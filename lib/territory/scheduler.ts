import { SupabaseClient } from '@supabase/supabase-js';
import { runRefreshWave } from './refresh';
import { runTaxTick } from './tax';
import { TerritoryParams } from './types';

export interface TerritoryTickActivity {
  id: string;
  status: string;
  next_refresh_at: string | null;
  next_tax_at: string | null;
  settings_json?: Partial<TerritoryParams> | null;
}

export interface TerritoryTickWorkItem {
  activity_id: string;
  refresh_due: boolean;
  tax_due: boolean;
}

export function planTerritoryTickWork(
  activities: TerritoryTickActivity[],
  now: Date = new Date(),
): TerritoryTickWorkItem[] {
  return activities
    .filter((activity) => activity.status === 'active')
    .map((activity) => ({
      activity_id: activity.id,
      refresh_due: isDue(activity.next_refresh_at, now),
      tax_due: isDue(activity.next_tax_at, now),
    }))
    .filter((activity) => activity.refresh_due || activity.tax_due);
}

export async function runScheduledTerritoryTicks(
  sb: SupabaseClient,
  now: Date = new Date(),
): Promise<TerritoryTickWorkItem[]> {
  const { error: cleanupError } = await sb.rpc('expire_territory_challenge_locks');
  if (cleanupError) {
    throw cleanupError;
  }

  const { data: activities, error } = await sb
    .from('activities')
    .select('id, status, next_refresh_at, next_tax_at, settings_json')
    .eq('status', 'active');

  if (error) {
    throw error;
  }

  const work = planTerritoryTickWork(
    (activities ?? []) as TerritoryTickActivity[],
    now,
  );

  for (const item of work) {
    const activity = (activities ?? []).find((candidate) => candidate.id === item.activity_id);
    const params = (activity?.settings_json ?? {}) as Partial<TerritoryParams>;

    if (item.refresh_due) {
      await runRefreshWave(sb, item.activity_id, params);
    }

    if (item.tax_due) {
      await runTaxTick(sb, item.activity_id, params);
    }
  }

  return work;
}

function isDue(timestamp: string | null, now: Date): boolean {
  return timestamp !== null && new Date(timestamp).getTime() <= now.getTime();
}
