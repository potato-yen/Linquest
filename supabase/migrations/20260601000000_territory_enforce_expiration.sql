-- Enforce activity expiration in territory and battle RPCs.
-- This migration ensures that capture, resolution, and battle invitations/acceptances 
-- are blocked once the activity status is no longer 'active' or its end time has passed.

-- 1. Helper to check if activity is still open for actions
create or replace function public.is_activity_open(p_activity public.activities)
returns boolean as $$
begin
  return p_activity.status = 'active'
    and now() < least(
      p_activity.ends_at,
      coalesce(p_activity.sudden_death_started_at + interval '12 hours', 'infinity'::timestamptz)
    );
end;
$$ language plpgsql immutable;

-- 2. Update attempt_capture
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
  if v_activity.id is null or not public.is_activity_open(v_activity) then
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

-- 3. Update resolve_challenge
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
  if v_activity.id is null or not public.is_activity_open(v_activity) then
    raise exception 'ACTIVITY_NOT_ACTIVE';
  end if;

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

-- 4. Update send_battle_invite
create or replace function public.send_battle_invite(
  p_activity_id uuid,
  p_tile_id uuid,
  p_defender_user_id uuid
) returns uuid as $$
declare
  v_caller uuid := auth.uid();
  v_now timestamptz := now();
  v_activity public.activities%rowtype;
  v_tile public.hex_tiles%rowtype;
  v_challenger_group_id uuid;
  v_challenger_treasury integer;
  v_defender_group_id uuid;
  v_cost integer;
  v_question_ids uuid[];
  v_battle_id uuid;
begin
  if v_caller is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_activity from public.activities where id = p_activity_id;
  if v_activity.id is null or not public.is_activity_open(v_activity) then
    raise exception 'ACTIVITY_NOT_ACTIVE';
  end if;

  select g.id, g.treasury
  into v_challenger_group_id, v_challenger_treasury
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where g.activity_id = p_activity_id
    and gm.user_id = v_caller
  limit 1;

  if v_challenger_group_id is null then
    raise exception 'NOT_GROUP_MEMBER';
  end if;

  select g.id
  into v_defender_group_id
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where g.activity_id = p_activity_id
    and gm.user_id = p_defender_user_id
  limit 1;

  if v_defender_group_id is null or v_defender_group_id = v_challenger_group_id then
    raise exception 'INVALID_OPPONENT';
  end if;

  if exists (
    select 1
    from public.battles b
    where (
      b.challenger_user_id = p_defender_user_id
      or b.defender_user_id = p_defender_user_id
    )
      and b.status in ('pending_invite', 'in_progress')
  ) then
    raise exception 'OPPONENT_ALREADY_IN_BATTLE';
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

  if v_tile.kind <> 'special' or v_tile.owner_group_id is not null then
    raise exception 'TILE_NOT_ELIGIBLE';
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

  if not exists (
    select 1
    from public.hex_tiles neighbor
    where neighbor.map_id = v_tile.map_id
      and neighbor.owner_group_id = v_challenger_group_id
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

  v_cost := coalesce((v_activity.settings_json->>'cost_special')::integer, 50);
  if v_challenger_treasury < v_cost then
    raise exception 'INSUFFICIENT_TREASURY';
  end if;

  select array_agg(id)
  into v_question_ids
  from (
    select id
    from public.questions
    where bank_id = v_activity.question_bank_id
    order by random()
    limit 5
  ) q;

  if v_question_ids is null or array_length(v_question_ids, 1) <> 5 then
    raise exception 'QUESTION_POOL_TOO_SMALL';
  end if;

  insert into public.battles (
    activity_id,
    tile_id,
    challenger_user_id,
    defender_user_id,
    status,
    question_ids
  ) values (
    p_activity_id,
    p_tile_id,
    v_caller,
    p_defender_user_id,
    'pending_invite',
    v_question_ids
  )
  returning id into v_battle_id;

  update public.groups
  set treasury = treasury - v_cost
  where id = v_challenger_group_id;

  update public.hex_tiles
  set
    active_battle_id = v_battle_id,
    active_challenge_id = v_battle_id,
    active_challenge_kind = 'capture_special',
    active_challenge_user_id = v_caller,
    active_challenge_until = null
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
    v_challenger_group_id,
    v_caller,
    'challenge_cost',
    -v_cost,
    jsonb_build_object('battle_id', v_battle_id, 'kind', 'capture_special')
  );

  return v_battle_id;
end;
$$ language plpgsql security definer set search_path = public;

-- 5. Update accept_battle_invite
create or replace function public.accept_battle_invite(p_battle_id uuid)
returns void as $$
declare
  v_caller uuid := auth.uid();
  v_battle public.battles%rowtype;
  v_activity public.activities%rowtype;
  v_invite_timeout_minutes integer;
begin
  if v_caller is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select *
  into v_battle
  from public.battles
  where id = p_battle_id
  for update;

  if v_battle.id is null then
    raise exception 'BATTLE_NOT_FOUND';
  end if;

  select * into v_activity from public.activities where id = v_battle.activity_id;
  if v_activity.id is null or not public.is_activity_open(v_activity) then
    raise exception 'ACTIVITY_NOT_ACTIVE';
  end if;

  if v_battle.defender_user_id <> v_caller then
    raise exception 'NOT_YOUR_INVITE';
  end if;

  if v_battle.status <> 'pending_invite' then
    raise exception 'BATTLE_NOT_PENDING';
  end if;

  select coalesce((settings_json->>'battle_invite_timeout_minutes')::integer, 5)
  into v_invite_timeout_minutes
  from public.activities
  where id = v_battle.activity_id;

  if now() > v_battle.created_at + make_interval(mins => v_invite_timeout_minutes) then
    raise exception 'INVITE_EXPIRED';
  end if;

  update public.battles
  set
    status = 'in_progress',
    challenger_last_heartbeat_at = now(),
    defender_last_heartbeat_at = now()
  where id = p_battle_id;

  perform public.advance_battle_question(p_battle_id);
end;
$$ language plpgsql security definer set search_path = public;

-- 6. Update apply_battle_result to block post-end captures
create or replace function public.apply_battle_result(
  p_battle_id uuid,
  p_winner_user_id uuid
) returns void as $$
declare
  v_battle public.battles%rowtype;
  v_tile public.hex_tiles%rowtype;
  v_activity public.activities%rowtype;
  v_winner_group_id uuid;
  v_special_protected_until timestamptz;
  v_special_reward integer;
begin
  if exists (
    select 1
    from public.territory_events
    where event_type = 'capture'
      and payload->>'battle_id' = p_battle_id::text
  ) then
    return;
  end if;

  select * into v_battle from public.battles where id = p_battle_id;
  if v_battle.id is null then return; end if;

  select * into v_activity from public.activities where id = v_battle.activity_id;
  -- For battle resolution, we only check status (ends_at might have passed during battle)
  -- but we definitely don't want to apply results if activity was settled/ended.
  if v_activity.status <> 'active' then
    return;
  end if;

  select * into v_tile from public.hex_tiles where id = v_battle.tile_id for update;
  if v_tile.id is null then return; end if;

  select g.id into v_winner_group_id
  from public.group_members gm
  join public.groups g on g.id = gm.group_id
  where gm.user_id = p_winner_user_id
    and g.activity_id = v_battle.activity_id
  limit 1;

  if v_winner_group_id is null then return; end if;

  v_special_protected_until := coalesce(
    v_activity.next_refresh_at,
    now() + make_interval(
      hours => coalesce((v_activity.settings_json->>'refresh_interval_hours')::integer, 12)
    )
  );
  v_special_reward := coalesce((v_activity.settings_json->>'cost_special')::integer, 50);

  update public.groups
  set treasury = treasury + v_special_reward
  where id = v_winner_group_id;

  update public.hex_tiles
  set
    owner_group_id = v_winner_group_id,
    protected_until = v_special_protected_until,
    last_taken_at = now(),
    active_battle_id = null,
    active_challenge_id = null,
    active_challenge_kind = null,
    active_challenge_user_id = null,
    active_challenge_until = null
  where id = v_tile.id;

  insert into public.territory_events (activity_id, tile_id, group_id, user_id, event_type, score_delta, payload)
  values (
    v_battle.activity_id,
    v_tile.id,
    v_winner_group_id,
    p_winner_user_id,
    'capture',
    v_special_reward,
    jsonb_build_object('battle_id', p_battle_id, 'kind', 'special')
  );
end;
$$ language plpgsql security definer set search_path = public;
