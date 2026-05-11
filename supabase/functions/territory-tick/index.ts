// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const TERRITORY_DEFAULTS = {
  refresh_interval_hours: 12,
  multiplier_ratio: 0.12,
  multiplier_2x_3x_split: [0.7, 0.3],
  special_ratio: 0.08,
  endgame_threshold: 0.15,
  tax_per_owned_tile_per_hour: 1,
  relief_threshold_treasury: 10,
} as const;

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('EXPO_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceRoleKey) {
    return json({ error: 'Hosted Supabase env is missing' }, 500);
  }

  const sb = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: cleanupError } = await sb.rpc('expire_territory_challenge_locks');
  if (cleanupError) {
    return json({ error: cleanupError.message }, 500);
  }

  const { data: activities, error: activitiesError } = await sb
    .from('activities')
    .select('id, status, map_id, next_refresh_at, next_tax_at, settings_json')
    .eq('status', 'active');

  if (activitiesError) {
    return json({ error: activitiesError.message }, 500);
  }

  const work = planTerritoryTickWork(activities ?? []);

  for (const item of work) {
    const activity = (activities ?? []).find((candidate) => candidate.id === item.activity_id);
    const params = {
      ...TERRITORY_DEFAULTS,
      ...(activity?.settings_json ?? {}),
    };

    if (item.refresh_due && activity?.map_id) {
      const { data: tiles, error: tilesError } = await sb
        .from('hex_tiles')
        .select('*')
        .eq('map_id', activity.map_id);

      if (tilesError) {
        return json({ error: tilesError.message }, 500);
      }

      const previousSpecialIds = (tiles ?? [])
        .filter((tile) => tile.kind === 'special')
        .map((tile) => tile.id);
      const pick = pickRefreshTargets(tiles ?? [], previousSpecialIds, params);
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
        return json({ error: error.message }, 500);
      }
    }

    if (item.tax_due) {
      const { error } = await sb.rpc('run_tax_tick', {
        p_activity_id: item.activity_id,
        p_base_rate: params.tax_per_owned_tile_per_hour,
        p_relief_threshold: params.relief_threshold_treasury,
      });

      if (error) {
        return json({ error: error.message }, 500);
      }
    }
  }

  const { error: battleInviteError } = await sb.rpc('expire_battle_invites');
  if (battleInviteError) {
    return json({ error: battleInviteError.message }, 500);
  }

  const { error: battleQuestionError } = await sb.rpc('expire_battle_questions');
  if (battleQuestionError) {
    return json({ error: battleQuestionError.message }, 500);
  }

  const { error: battleDisconnectError } = await sb.rpc('expire_battle_disconnects');
  if (battleDisconnectError) {
    return json({ error: battleDisconnectError.message }, 500);
  }

  const { error: orphanLockError } = await sb.rpc('sweep_orphan_battle_locks');
  if (orphanLockError) {
    return json({ error: orphanLockError.message }, 500);
  }

  const { error: teacherConsoleTickError } = await sb.rpc('tick_activity_lifecycle');
  if (teacherConsoleTickError) {
    console.error('tick_activity_lifecycle failed', teacherConsoleTickError.message);
  }

  return json({ processed: work.length, work });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function planTerritoryTickWork(
  activities: Array<{
    id: string;
    status: string;
    next_refresh_at: string | null;
    next_tax_at: string | null;
  }>,
  now: Date = new Date(),
) {
  return activities
    .filter((activity) => activity.status === 'active')
    .map((activity) => ({
      activity_id: activity.id,
      refresh_due: isDue(activity.next_refresh_at, now),
      tax_due: isDue(activity.next_tax_at, now),
    }))
    .filter((activity) => activity.refresh_due || activity.tax_due);
}

function isDue(timestamp: string | null, now: Date): boolean {
  return timestamp !== null && new Date(timestamp).getTime() <= now.getTime();
}

function pickRefreshTargets(tiles: any[], previousSpecialTileIds: string[], params: any) {
  const previousSpecials = new Set(previousSpecialTileIds);
  const multiplierEligible = tiles.filter((tile) => !tile.is_capital);
  const neutralTiles = tiles.filter((tile) => !tile.is_capital && tile.owner_group_id === null);
  const multiplierCount = Math.round(multiplierEligible.length * params.multiplier_ratio);
  const multiplierCandidates = shuffle(multiplierEligible)
    .slice(0, multiplierCount)
    .map((tile) => ({
      tile,
      multiplier: Math.random() < params.multiplier_2x_3x_split[0] ? 2 : 3,
    }));

  const specialCandidatePool = neutralTiles.filter((tile) => !previousSpecials.has(tile.id));
  const neutralShare = neutralTiles.length / Math.max(tiles.length, 1);
  let policy = 'normal';
  let specialTargets: Array<{ id: string }> = [];

  if (specialCandidatePool.length > 0) {
    if (neutralShare <= params.endgame_threshold) {
      policy = 'endgame_all_special';
      specialTargets = specialCandidatePool.map((tile) => ({ id: tile.id }));
    } else {
      const specialCount = Math.round(specialCandidatePool.length * params.special_ratio);
      specialTargets = shuffle(specialCandidatePool)
        .slice(0, specialCount)
        .map((tile) => ({ id: tile.id }));
    }
  }

  const specialIds = new Set(specialTargets.map((target) => target.id));
  const multiplierTargets = multiplierCandidates.filter((target) => !specialIds.has(target.tile.id));

  if (multiplierTargets.length < multiplierCount) {
    const refill = shuffle(
      multiplierEligible.filter((tile) =>
        !specialIds.has(tile.id) &&
        !multiplierTargets.some((target) => target.tile.id === tile.id),
      ),
    )
      .slice(0, multiplierCount - multiplierTargets.length)
      .map((tile) => ({
        tile,
        multiplier: Math.random() < params.multiplier_2x_3x_split[0] ? 2 : 3,
      }));

    multiplierTargets.push(...refill);
  }

  return {
    policy,
    multiplier_targets: multiplierTargets,
    special_targets: specialTargets,
  };
}

function shuffle(items: any[]) {
  const out = items.slice();

  for (let index = out.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [out[index], out[swapIndex]] = [out[swapIndex], out[index]];
  }

  return out;
}
