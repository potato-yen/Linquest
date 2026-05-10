create or replace function public.attempt_capture(
  p_activity_id uuid,
  p_tile_id uuid
) returns table (challenge_id uuid, tile jsonb) as $$
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
  select v_challenge_id, to_jsonb(v_tile);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.resolve_challenge(
  p_activity_id uuid,
  p_tile_id uuid,
  p_challenge_id uuid,
  p_all_correct boolean
) returns void as $$
declare
  v_activity public.activities%rowtype;
  v_tile public.hex_tiles%rowtype;
  v_attacker_group_id uuid;
  v_defender_group_id uuid;
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_kind text;
  v_cost integer;
  v_success_reward integer;
  v_additional_fail_attacker_delta integer;
  v_fail_defender_delta integer;
  v_cooldown_seconds integer := 0;
  v_cooldown_until timestamptz;
  v_special_protected_until timestamptz;
  v_event_type public.territory_event_type;
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

  if v_tile.active_challenge_user_id is distinct from v_user_id then
    raise exception 'CHALLENGE_USER_MISMATCH';
  end if;

  if v_tile.active_challenge_id is distinct from p_challenge_id then
    raise exception 'CHALLENGE_ID_MISMATCH';
  end if;

  if v_tile.active_challenge_until is not null and v_tile.active_challenge_until < v_now then
    raise exception 'CHALLENGE_EXPIRED';
  end if;

  v_kind := v_tile.active_challenge_kind;
  if v_kind is null then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  select g.id
  into v_attacker_group_id
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where g.activity_id = p_activity_id
    and gm.user_id = v_user_id
  limit 1;

  if v_attacker_group_id is null then
    raise exception 'NOT_GROUP_MEMBER';
  end if;

  v_defender_group_id := v_tile.owner_group_id;
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
    v_additional_fail_attacker_delta := 0;
    v_fail_defender_delta := 0;
  else
    v_success_reward := round(v_cost * coalesce((v_activity.settings_json->>'roi_factor')::numeric, 1.6));
    v_additional_fail_attacker_delta := 0;
    v_fail_defender_delta := 0;
  end if;

  if p_all_correct and v_kind <> 'capture_special' then
    v_cooldown_seconds := coalesce((v_activity.settings_json->>'tile_cooldown_minutes')::integer, 5) * 60;
  elsif not p_all_correct and v_kind in ('reverse_normal', 'reverse_multiplier') then
    v_cooldown_seconds := coalesce((v_activity.settings_json->>'tile_cooldown_minutes')::integer, 5) * 60;
  end if;

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
        kind = 'normal',
        multiplier = null,
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
        kind = 'normal',
        multiplier = null,
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
        kind = 'normal',
        multiplier = null,
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
          jsonb_build_object('challenge_id', p_challenge_id, 'kind', v_kind, 'role', 'defender_bonus')
        );
      end if;
    elsif v_kind = 'self_recapture_multiplier' then
      update public.hex_tiles
      set
        kind = 'normal',
        multiplier = null,
        active_challenge_id = null,
        active_challenge_kind = null,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
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
        v_attacker_group_id,
        v_user_id,
        'multiplier_self_recapture',
        0,
        jsonb_build_object('challenge_id', p_challenge_id, 'kind', v_kind, 'role', 'fail')
      );
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

create or replace function public.settle_activity(
  p_activity_id uuid
) returns void as $$
declare
  v_activity public.activities%rowtype;
begin
  select *
  into v_activity
  from public.activities
  where id = p_activity_id
  for update;

  if v_activity.id is null or v_activity.status <> 'active' then
    raise exception 'ACTIVITY_NOT_ACTIVE';
  end if;

  perform public.run_tax_tick(
    p_activity_id,
    coalesce((v_activity.settings_json->>'tax_per_owned_tile_per_hour')::integer, 1),
    coalesce((v_activity.settings_json->>'relief_threshold_treasury')::integer, 10),
    now()
  );

  if v_activity.map_id is not null then
    update public.hex_tiles
    set
      active_challenge_id = null,
      active_challenge_kind = null,
      active_challenge_user_id = null,
      active_challenge_until = null,
      active_battle_id = null
    where map_id = v_activity.map_id;
  end if;

  update public.activities
  set status = 'ended'
  where id = p_activity_id;
end;
$$ language plpgsql security definer set search_path = public;
