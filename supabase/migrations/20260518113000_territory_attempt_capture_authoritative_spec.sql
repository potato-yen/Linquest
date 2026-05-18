drop function if exists public.attempt_capture(uuid, uuid);

create or replace function public.attempt_capture(
  p_activity_id uuid,
  p_tile_id uuid
) returns table (challenge_id uuid, tile jsonb, spec jsonb) as $$
declare
  v_activity public.activities%rowtype;
  v_tile public.hex_tiles%rowtype;
  v_group_id uuid;
  v_treasury integer;
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_challenge_id uuid := gen_random_uuid();
  v_kind text;
  v_cost integer;
  v_lock_seconds integer;
  v_question_count integer;
  v_difficulty text;
  v_success_reward integer;
  v_fail_defender_delta integer := 0;
  v_fail_attacker_delta integer;
  v_applies_cooldown_on_success boolean;
  v_applies_cooldown_on_fail boolean;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select *
  into v_activity
  from public.activities
  where id = p_activity_id;

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
    raise exception 'NOT_ADJACENT';
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

grant execute on function public.attempt_capture(uuid, uuid) to authenticated;
