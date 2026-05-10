// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';
import { planTerritoryTickWork } from '../../../lib/territory/scheduler.ts';
import { pickRefreshTargets } from '../../../lib/territory/refresh-policy.ts';
import { TERRITORY_DEFAULTS, TerritoryParams } from '../../../lib/territory/types.ts';

Deno.serve(async () => {
  const url = Deno.env.get('EXPO_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Hosted Supabase env is missing' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const sb = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: cleanupError } = await sb.rpc('expire_territory_challenge_locks');
  if (cleanupError) {
    return new Response(
      JSON.stringify({ error: cleanupError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { data: activities, error: activitiesError } = await sb
    .from('activities')
    .select('id, status, map_id, next_refresh_at, next_tax_at, settings_json')
    .eq('status', 'active');

  if (activitiesError) {
    return new Response(
      JSON.stringify({ error: activitiesError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const work = planTerritoryTickWork(activities ?? []);

  for (const item of work) {
    const activity = (activities ?? []).find((candidate) => candidate.id === item.activity_id);
    const params = {
      ...TERRITORY_DEFAULTS,
      ...((activity?.settings_json ?? {}) as Partial<TerritoryParams>),
    };

    if (item.refresh_due && activity?.map_id) {
      const { data: tiles, error: tilesError } = await sb
        .from('hex_tiles')
        .select('*')
        .eq('map_id', activity.map_id);

      if (tilesError) {
        return new Response(
          JSON.stringify({ error: tilesError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
      }

      const previousSpecialIds = (tiles ?? [])
        .filter((tile) => tile.kind === 'special')
        .map((tile) => tile.id as string);
      const pick = pickRefreshTargets(tiles as any, previousSpecialIds, params);
      const { error } = await sb.rpc('run_refresh_wave', {
        p_activity_id: item.activity_id,
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
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }

    if (item.tax_due) {
      const { error } = await sb.rpc('run_tax_tick', {
        p_activity_id: item.activity_id,
        p_base_rate: params.tax_per_owned_tile_per_hour,
        p_relief_threshold: params.relief_threshold_treasury,
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
      }
    }
  }

  return new Response(
    JSON.stringify({ processed: work.length, work }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
