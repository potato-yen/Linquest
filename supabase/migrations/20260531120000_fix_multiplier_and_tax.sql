-- Fix multiplier tiles, tax calculation, and dashboard rankings.
-- This migration ensures multiplier tiles are persistent until refresh and contribute correctly to tax and scores.

-- 1. Update run_tax_tick to account for multiplier tiles
create or replace function public.run_tax_tick(
  p_activity_id uuid,
  p_base_rate integer,
  p_relief_threshold integer,
  p_now timestamptz default now()
) returns void as $$
declare
  v_group record;
  v_owned integer;
  v_capital integer;
  v_rate integer;
  v_amount integer;
begin
  for v_group in
    select id, treasury
    from public.groups
    where activity_id = p_activity_id
  loop
    -- Weighted count: multiplier tiles count as 2 or 3
    select coalesce(sum(coalesce(multiplier, 1)), 0)::integer into v_owned
    from public.hex_tiles
    where owner_group_id = v_group.id;

    select count(*)::integer into v_capital
    from public.hex_tiles
    where owner_group_id = v_group.id
      and is_capital = true;

    v_rate := p_base_rate;
    if v_group.treasury < p_relief_threshold and v_owned = v_capital then
      v_rate := p_base_rate * 2;
    end if;

    v_amount := v_rate * v_owned;

    update public.groups
    set treasury = treasury + v_amount
    where id = v_group.id;

    insert into public.territory_events (
      activity_id,
      group_id,
      event_type,
      score_delta,
      occurred_at,
      payload
    ) values (
      p_activity_id,
      v_group.id,
      'tax_tick',
      v_amount,
      p_now,
      jsonb_build_object(
        'rate',
        v_rate,
        'owned_count',
        v_owned,
        'relief',
        v_rate > p_base_rate
      )
    );
  end loop;

  update public.activities
  set next_tax_at = p_now + interval '1 hour'
  where id = p_activity_id;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Update get_activity_dashboard to use weighted owned_count
create or replace function public.get_activity_dashboard(
  p_activity_id uuid
) returns jsonb as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
  v_effective_end_at timestamptz;
  v_time_remaining integer;
  v_groups jsonb;
  v_map_summary jsonb;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select a.*
  into v_activity
  from public.activities a
  join public.classes c on c.id = a.class_id
  where a.id = p_activity_id
    and c.owner_teacher_id = v_user_id;

  if v_activity.id is null then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  if v_activity.status not in ('active', 'ended') then
    raise exception 'ACTIVITY_NOT_ACTIVE';
  end if;

  v_effective_end_at := case
    when v_activity.sudden_death_started_at is null
      then v_activity.ends_at
    else least(v_activity.ends_at, v_activity.sudden_death_started_at + interval '12 hours')
  end;
  v_time_remaining := greatest(0, floor(extract(epoch from (v_effective_end_at - now())))::integer);

  select coalesce(jsonb_agg(group_row order by (group_row->>'name')), '[]'::jsonb)
  into v_groups
  from (
    select jsonb_build_object(
      'id', g.id,
      'name', g.name,
      'color', g.color,
      'treasury', g.treasury,
      'owned_count', coalesce(tile_counts.owned_count, 0),
      'member_count', coalesce(member_counts.member_count, 0)
    ) as group_row
    from public.groups g
    left join (
      -- Weighted count: multiplier tiles count as 2 or 3
      select owner_group_id as group_id, sum(coalesce(multiplier, 1))::integer as owned_count
      from public.hex_tiles
      where map_id = v_activity.map_id
        and owner_group_id is not null
      group by owner_group_id
    ) tile_counts on tile_counts.group_id = g.id
    left join (
      select group_id, count(*)::integer as member_count
      from public.group_members
      group by group_id
    ) member_counts on member_counts.group_id = g.id
    where g.activity_id = p_activity_id
  ) grouped;

  select jsonb_build_object(
    'total_tiles', count(*)::integer,
    'neutral_count', count(*) filter (where owner_group_id is null)::integer,
    'capital_count', count(*) filter (where is_capital)::integer,
    'special_count', count(*) filter (where kind = 'special')::integer,
    'multiplier_count', count(*) filter (where kind = 'multiplier')::integer
  )
  into v_map_summary
  from public.hex_tiles
  where map_id = v_activity.map_id;

  return jsonb_build_object(
    'activity', jsonb_build_object(
      'id', v_activity.id,
      'name', v_activity.name,
      'status', v_activity.status,
      'starts_at', v_activity.starts_at,
      'ends_at', v_activity.ends_at,
      'sudden_death_started_at', v_activity.sudden_death_started_at,
      'effective_end_at', v_effective_end_at,
      'time_remaining_seconds', case when v_activity.status = 'ended' then 0 else v_time_remaining end
    ),
    'groups', coalesce(v_groups, '[]'::jsonb),
    'map_summary', coalesce(
      v_map_summary,
      jsonb_build_object(
        'total_tiles', 0,
        'neutral_count', 0,
        'capital_count', 0,
        'special_count', 0,
        'multiplier_count', 0
      )
    )
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Update get_activity_settlement to use weighted owned_count
create or replace function public.get_activity_settlement(
  p_activity_id uuid
) returns jsonb as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
  v_rankings_treasury jsonb;
  v_rankings_territory jsonb;
  v_common_mistakes jsonb;
  v_accuracy jsonb;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select a.*
  into v_activity
  from public.activities a
  join public.classes c on c.id = a.class_id
  where a.id = p_activity_id
    and c.owner_teacher_id = v_user_id;

  if v_activity.id is null then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  if v_activity.status <> 'ended' then
    raise exception 'ACTIVITY_NOT_ENDED';
  end if;

  select coalesce(jsonb_agg(row_data order by (row_data->>'rank')::integer), '[]'::jsonb)
  into v_rankings_treasury
  from (
    select jsonb_build_object(
      'group_id', ranked.id,
      'name', ranked.name,
      'color', ranked.color,
      'treasury', ranked.treasury,
      'rank', ranked.rank
    ) as row_data
    from (
      select
        g.id,
        g.name,
        g.color,
        g.treasury,
        row_number() over (order by g.treasury desc, g.name asc) as rank
      from public.groups g
      where g.activity_id = p_activity_id
    ) ranked
  ) treasury_rows;

  select coalesce(jsonb_agg(row_data order by (row_data->>'rank')::integer), '[]'::jsonb)
  into v_rankings_territory
  from (
    select jsonb_build_object(
      'group_id', ranked.id,
      'name', ranked.name,
      'color', ranked.color,
      'owned_count', ranked.owned_count,
      'rank', ranked.rank
    ) as row_data
    from (
      select
        g.id,
        g.name,
        g.color,
        coalesce(tile_counts.owned_count, 0) as owned_count,
        row_number() over (order by coalesce(tile_counts.owned_count, 0) desc, g.name asc) as rank
      from public.groups g
      left join (
        -- Weighted count: multiplier tiles count as 2 or 3
        select owner_group_id as group_id, sum(coalesce(multiplier, 1))::integer as owned_count
        from public.hex_tiles
        where map_id = v_activity.map_id
          and owner_group_id is not null
        group by owner_group_id
      ) tile_counts on tile_counts.group_id = g.id
      where g.activity_id = p_activity_id
    ) ranked
  ) territory_rows;

  select coalesce(jsonb_agg(to_jsonb(mistakes_row)), '[]'::jsonb)
  into v_common_mistakes
  from public.get_activity_common_mistakes(p_activity_id, 10) as mistakes_row;

  v_accuracy := public.get_activity_accuracy(p_activity_id);

  return jsonb_build_object(
    'rankings_treasury', coalesce(v_rankings_treasury, '[]'::jsonb),
    'rankings_territory', coalesce(v_rankings_territory, '[]'::jsonb),
    'common_mistakes', coalesce(v_common_mistakes, '[]'::jsonb),
    'accuracy', v_accuracy
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 4. Update attempt_capture to allow self-recapture and fix adjacency check
drop function if exists public.attempt_capture(uuid, uuid);

create or replace function public.attempt_capture(
  p_activity_id uuid,
  p_tile_id uuid
) returns table (challenge_id uuid, tile jsonb, spec jsonb) as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_group_id uuid;
  v_treasury integer;
  v_tile record;
  v_kind text;
  v_cost integer;
  v_lock_seconds integer;
  v_challenge_id uuid := gen_random_uuid();
  v_question_count integer;
  v_difficulty text;
  v_success_reward integer;
  v_fail_attacker_delta integer;
  v_fail_defender_delta integer := 0;
  v_applies_cooldown_on_success boolean;
  v_applies_cooldown_on_fail boolean;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_activity from public.activities where id = p_activity_id;
  if v_activity.id is null or v_activity.status <> 'active' then
    raise exception 'ACTIVITY_NOT_ACTIVE';
  end if;

  select g.id, g.treasury
  into v_group_id, v_treasury
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where g.activity_id = p_activity_id
    and gm.user_id = v_user_id
  limit 1;

  if v_group_id is null then
    raise exception 'NOT_GROUP_MEMBER';
  end if;

  select ht.*
  into v_tile
  from public.hex_tiles ht
  join public.maps m on m.id = ht.map_id
  where ht.id = p_tile_id
    and m.activity_id = p_activity_id
  for update;

  if v_tile.id is null then
    raise exception 'TILE_NOT_FOUND';
  end if;

  -- Adjacency check: allowed if owning the tile (self-recapture) OR owning a neighbor
  if v_tile.owner_group_id is distinct from v_group_id then
    if not exists (
      select 1
      from public.hex_tiles neighbor
      where neighbor.map_id = v_tile.map_id
        and neighbor.owner_group_id = v_group_id
        and (
          (neighbor.q = v_tile.q + 1 and neighbor.r = v_tile.r    ) or
          (neighbor.q = v_tile.q - 1 and neighbor.r = v_tile.r    ) or
          (neighbor.q = v_tile.q     and neighbor.r = v_tile.r + 1) or
          (neighbor.q = v_tile.q     and neighbor.r = v_tile.r - 1) or
          (neighbor.q = v_tile.q + 1 and neighbor.r = v_tile.r - 1) or
          (neighbor.q = v_tile.q - 1 and neighbor.r = v_tile.r + 1)
        )
    ) then
      raise exception 'NOT_ADJACENT';
    end if;
  end if;

  if v_tile.is_capital then
    raise exception 'CAPITAL_IMMUNE';
  end if;

  if v_tile.protected_until is not null and v_tile.protected_until > v_now then
    raise exception 'PROTECTED';
  end if;

  if (v_tile.active_challenge_until is not null and v_tile.active_challenge_until > v_now)
    or v_tile.active_battle_id is not null then
    raise exception 'LOCKED_BY_OTHER';
  end if;

  if v_tile.kind = 'special' then
    if v_tile.owner_group_id is not null then
      raise exception 'PROTECTED';
    end if;
    v_kind := 'capture_special';
  elsif v_tile.kind = 'multiplier' then
    if v_tile.owner_group_id is null then
      v_kind := 'capture_multiplier';
    elsif v_tile.owner_group_id = v_group_id then
      v_kind := 'self_recapture_multiplier';
    else
      v_kind := 'reverse_multiplier';
    end if;
  elsif v_tile.owner_group_id is null then
    v_kind := 'capture_normal';
  elsif v_tile.owner_group_id = v_group_id then
    raise exception 'ALREADY_OWNED';
  else
    v_kind := 'reverse_normal';
  end if;

  v_cost := case
    when v_kind = 'capture_special' then coalesce((v_activity.settings_json->>'cost_special')::integer, 50)
    when v_kind = 'self_recapture_multiplier' and v_tile.multiplier = 3 then coalesce((v_activity.settings_json->>'cost_2x')::integer, 20)
    when v_kind = 'self_recapture_multiplier' then coalesce((v_activity.settings_json->>'cost_normal')::integer, 10)
    when v_tile.kind = 'multiplier' and v_tile.multiplier = 3 then coalesce((v_activity.settings_json->>'cost_3x')::integer, 30)
    when v_tile.kind = 'multiplier' and v_tile.multiplier = 2 then coalesce((v_activity.settings_json->>'cost_2x')::integer, 20)
    else coalesce((v_activity.settings_json->>'cost_normal')::integer, 10)
  end;

  if v_treasury < v_cost then
    raise exception 'INSUFFICIENT_TREASURY';
  end if;

  v_lock_seconds := case
    when v_kind = 'capture_special'
      then coalesce((v_activity.settings_json->>'battle_invite_timeout_minutes')::integer, 5) * 60
    else coalesce((v_activity.settings_json->>'challenge_lock_seconds')::integer, 90)
  end;

  if v_kind = 'capture_special' then
    v_question_count := 0;
    v_difficulty := 'standard';
    v_success_reward := v_cost;
    v_fail_attacker_delta := -v_cost;
    v_applies_cooldown_on_success := false;
    v_applies_cooldown_on_fail := false;
  elsif v_kind in ('capture_multiplier', 'reverse_multiplier', 'self_recapture_multiplier') then
    v_question_count := case
      when v_kind = 'capture_multiplier' and v_tile.multiplier = 2 then 10
      when v_kind = 'capture_multiplier' then 15
      when v_kind = 'reverse_multiplier' and v_tile.multiplier = 2 then 14
      when v_kind = 'reverse_multiplier' then 18
      else (v_tile.multiplier - 1) * 5
    end;
    v_difficulty := 'advanced';
    v_applies_cooldown_on_success := true;
    v_applies_cooldown_on_fail := v_kind = 'reverse_multiplier';

    if v_kind = 'reverse_multiplier' then
      v_success_reward := round(v_cost * coalesce((v_activity.settings_json->>'roi_factor')::numeric, 1.6) * coalesce((v_activity.settings_json->>'reverse_attack_reward_factor')::numeric, 1.25));
      v_fail_defender_delta := round(v_cost * (coalesce((v_activity.settings_json->>'reverse_attack_fail_factor')::numeric, 1.5) - 1.0));
      v_fail_attacker_delta := -round(v_cost * coalesce((v_activity.settings_json->>'reverse_attack_fail_factor')::numeric, 1.5));
    else
      v_success_reward := round(v_cost * coalesce((v_activity.settings_json->>'roi_factor')::numeric, 1.6));
      v_fail_attacker_delta := -v_cost;
    end if;
  else
    v_question_count := case when v_kind = 'capture_normal' then 5 else 7 end;
    v_difficulty := 'standard';
    v_applies_cooldown_on_success := true;
    v_applies_cooldown_on_fail := v_kind = 'reverse_normal';

    if v_kind = 'reverse_normal' then
      v_success_reward := round(v_cost * coalesce((v_activity.settings_json->>'roi_factor')::numeric, 1.6) * coalesce((v_activity.settings_json->>'reverse_attack_reward_factor')::numeric, 1.25));
      v_fail_defender_delta := round(v_cost * (coalesce((v_activity.settings_json->>'reverse_attack_fail_factor')::numeric, 1.5) - 1.0));
      v_fail_attacker_delta := -round(v_cost * coalesce((v_activity.settings_json->>'reverse_attack_fail_factor')::numeric, 1.5));
    else
      v_success_reward := round(v_cost * coalesce((v_activity.settings_json->>'roi_factor')::numeric, 1.6));
      v_fail_attacker_delta := -v_cost;
    end if;
  end if;

  update public.groups
  set treasury = treasury - v_cost
  where id = v_group_id;

  update public.hex_tiles
  set
    active_challenge_id = v_challenge_id,
    active_challenge_kind = v_kind,
    active_challenge_user_id = v_user_id,
    active_challenge_until = v_now + make_interval(secs => v_lock_seconds),
    active_battle_id = case when v_kind = 'capture_special' then v_challenge_id else null end
  where id = p_tile_id;

  insert into public.territory_events (activity_id, tile_id, group_id, user_id, event_type, score_delta, payload)
  values (
    p_activity_id,
    p_tile_id,
    v_group_id,
    v_user_id,
    'challenge_cost',
    -v_cost,
    jsonb_build_object('challenge_id', v_challenge_id, 'kind', v_kind)
  );

  select *
  into v_tile
  from public.hex_tiles
  where id = p_tile_id;

  return query
  select
    v_challenge_id,
    to_jsonb(v_tile),
    jsonb_build_object(
      'kind', v_kind,
      'question_count', v_question_count,
      'difficulty', v_difficulty,
      'cost', v_cost,
      'success_reward', v_success_reward,
      'fail_attacker_delta', v_fail_attacker_delta,
      'fail_defender_delta', v_fail_defender_delta,
      'applies_cooldown_on_success', v_applies_cooldown_on_success,
      'applies_cooldown_on_fail', v_applies_cooldown_on_fail
    );
end;
$$ language plpgsql security definer set search_path = public;

-- 5. Update resolve_challenge to preserve multiplier kind/value on capture
create or replace function public.resolve_challenge(
  p_activity_id uuid,
  p_tile_id uuid,
  p_challenge_id uuid,
  p_all_correct boolean
) returns void as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_tile record;
  v_attacker_group_id uuid;
  v_defender_group_id uuid;
  v_kind text;
  v_cost integer;
  v_success_reward integer;
  v_additional_fail_attacker_delta integer := 0;
  v_fail_defender_delta integer := 0;
  v_event_type public.territory_event_type;
  v_cooldown_seconds integer;
  v_cooldown_until timestamptz;
  v_special_protected_until timestamptz;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_activity from public.activities where id = p_activity_id;

  select ht.*, ht.owner_group_id as defender_group_id
  into v_tile
  from public.hex_tiles ht
  where ht.id = p_tile_id and ht.active_challenge_id = p_challenge_id;

  if v_tile.id is null then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  if v_tile.active_challenge_user_id <> v_user_id then
    raise exception 'CHALLENGE_USER_MISMATCH';
  end if;

  if v_tile.active_challenge_until < v_now then
    raise exception 'CHALLENGE_EXPIRED';
  end if;

  v_attacker_group_id := (
    select group_id from public.group_members where user_id = v_user_id and group_id in (
      select id from public.groups where activity_id = p_activity_id
    )
  );
  v_defender_group_id := v_tile.defender_group_id;
  v_kind := v_tile.active_challenge_kind;

  -- Recalculate cost and reward to match attempt_capture logic
  v_cost := case
    when v_kind = 'capture_special' then coalesce((v_activity.settings_json->>'cost_special')::integer, 50)
    when v_kind = 'self_recapture_multiplier' and v_tile.multiplier = 3 then coalesce((v_activity.settings_json->>'cost_2x')::integer, 20)
    when v_kind = 'self_recapture_multiplier' then coalesce((v_activity.settings_json->>'cost_normal')::integer, 10)
    when v_tile.kind = 'multiplier' and v_tile.multiplier = 3 then coalesce((v_activity.settings_json->>'cost_3x')::integer, 30)
    when v_tile.kind = 'multiplier' and v_tile.multiplier = 2 then coalesce((v_activity.settings_json->>'cost_2x')::integer, 20)
    else coalesce((v_activity.settings_json->>'cost_normal')::integer, 10)
  end;

  if v_kind in ('reverse_normal', 'reverse_multiplier') then
    v_success_reward := round(v_cost * coalesce((v_activity.settings_json->>'roi_factor')::numeric, 1.6) * coalesce((v_activity.settings_json->>'reverse_attack_reward_factor')::numeric, 1.25));
    v_additional_fail_attacker_delta := -round(v_cost * (coalesce((v_activity.settings_json->>'reverse_attack_fail_factor')::numeric, 1.5) - 1.0));
    v_fail_defender_delta := round(v_cost * (coalesce((v_activity.settings_json->>'reverse_attack_fail_factor')::numeric, 1.5) - 1.0));
  elsif v_kind = 'capture_special' then
    v_success_reward := v_cost;
  else
    v_success_reward := round(v_cost * coalesce((v_activity.settings_json->>'roi_factor')::numeric, 1.6));
  end if;

  v_cooldown_seconds := case
    when p_all_correct then coalesce((v_activity.settings_json->>'tile_cooldown_minutes')::integer, 5) * 60
    when v_kind in ('reverse_normal', 'reverse_multiplier') then coalesce((v_activity.settings_json->>'tile_cooldown_minutes')::integer, 5) * 60
    else 0
  end;

  if v_cooldown_seconds > 0 then
    v_cooldown_until := v_now + make_interval(secs => v_cooldown_seconds);
  else
    v_cooldown_until := null;
  end if;

  if v_kind = 'capture_special' then
    v_special_protected_until := coalesce(
      v_activity.next_refresh_at,
      v_now + make_interval(hours => coalesce((v_activity.settings_json->>'refresh_interval_hours')::integer, 12))
    );
  else
    v_special_protected_until := null;
  end if;

  if p_all_correct then
    if v_kind = 'capture_normal' then
      update public.hex_tiles
      set
        owner_group_id = v_attacker_group_id,
        protected_until = v_cooldown_until,
        last_taken_at = v_now,
        active_challenge_id = null,
        active_challenge_kind = null,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'capture';
    elsif v_kind = 'reverse_normal' then
      update public.hex_tiles
      set
        owner_group_id = v_attacker_group_id,
        protected_until = v_cooldown_until,
        last_taken_at = v_now,
        active_challenge_id = null,
        active_challenge_kind = null,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'reverse_attack_win';
    elsif v_kind = 'capture_multiplier' then
      update public.hex_tiles
      set
        owner_group_id = v_attacker_group_id,
        -- KEEP kind and multiplier persistent!
        protected_until = v_cooldown_until,
        last_taken_at = v_now,
        active_challenge_id = null,
        active_challenge_kind = null,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'capture';
    elsif v_kind = 'reverse_multiplier' then
      update public.hex_tiles
      set
        owner_group_id = v_attacker_group_id,
        -- KEEP kind and multiplier persistent!
        protected_until = v_cooldown_until,
        last_taken_at = v_now,
        active_challenge_id = null,
        active_challenge_kind = null,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'reverse_attack_win';
    elsif v_kind = 'self_recapture_multiplier' then
      update public.hex_tiles
      set
        -- KEEP kind and multiplier persistent!
        protected_until = v_cooldown_until,
        last_taken_at = v_now,
        active_challenge_id = null,
        active_challenge_kind = null,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'multiplier_self_recapture';
    elsif v_kind = 'capture_special' then
      update public.hex_tiles
      set
        owner_group_id = v_attacker_group_id,
        protected_until = v_special_protected_until,
        last_taken_at = v_now,
        active_challenge_id = null,
        active_challenge_kind = null,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'capture';
    else
      raise exception 'CHALLENGE_NOT_FOUND';
    end if;

    update public.groups
    set treasury = treasury + v_success_reward
    where id = v_attacker_group_id;

    insert into public.territory_events (
      activity_id,
      tile_id,
      group_id,
      user_id,
      event_type,
      score_delta,
      payload
    ) values (
      p_activity_id,
      p_tile_id,
      v_attacker_group_id,
      v_user_id,
      v_event_type,
      v_success_reward,
      jsonb_build_object('challenge_id', p_challenge_id, 'kind', v_kind)
    );
  else
    if v_kind in ('reverse_normal', 'reverse_multiplier') then
      update public.hex_tiles
      set
        protected_until = v_cooldown_until,
        active_challenge_id = null,
        active_challenge_kind = null,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;

      if v_additional_fail_attacker_delta <> 0 then
        update public.groups
        set treasury = treasury + v_additional_fail_attacker_delta
        where id = v_attacker_group_id;

        insert into public.territory_events (
          activity_id,
          tile_id,
          group_id,
          user_id,
          event_type,
          score_delta,
          payload
        ) values (
          p_activity_id,
          p_tile_id,
          v_attacker_group_id,
          v_user_id,
          'reverse_attack_fail',
          v_additional_fail_attacker_delta,
          jsonb_build_object('challenge_id', p_challenge_id, 'kind', v_kind)
        );
      end if;

      if v_defender_group_id is not null and v_fail_defender_delta <> 0 then
        update public.groups
        set treasury = treasury + v_fail_defender_delta
        where id = v_defender_group_id;

        insert into public.territory_events (
          activity_id,
          tile_id,
          group_id,
          user_id,
          event_type,
          score_delta,
          payload
        ) values (
          p_activity_id,
          p_tile_id,
          v_defender_group_id,
          null,
          'reverse_attack_fail',
          v_fail_defender_delta,
          jsonb_build_object('challenge_id', p_challenge_id, 'kind', v_kind)
        );
      end if;
    else
      update public.hex_tiles
      set
        active_challenge_id = null,
        active_challenge_kind = null,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
    end if;
  end if;
end;
$$ language plpgsql security definer set search_path = public;
