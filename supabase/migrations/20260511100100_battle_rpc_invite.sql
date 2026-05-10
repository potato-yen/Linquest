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

  select *
  into v_activity
  from public.activities
  where id = p_activity_id;

  if v_activity.id is null or v_activity.status <> 'active' then
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

grant execute on function public.send_battle_invite(uuid, uuid, uuid) to authenticated;

create or replace function public.accept_battle_invite(p_battle_id uuid)
returns void as $$
declare
  v_caller uuid := auth.uid();
  v_battle public.battles%rowtype;
  v_invite_timeout_minutes integer;
begin
  select *
  into v_battle
  from public.battles
  where id = p_battle_id
  for update;

  if v_battle.id is null then
    raise exception 'BATTLE_NOT_FOUND';
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

grant execute on function public.accept_battle_invite(uuid) to authenticated;

create or replace function public.decline_battle_invite(p_battle_id uuid)
returns void as $$
declare
  v_caller uuid := auth.uid();
  v_battle public.battles%rowtype;
begin
  select *
  into v_battle
  from public.battles
  where id = p_battle_id
  for update;

  if v_battle.id is null then
    raise exception 'BATTLE_NOT_FOUND';
  end if;

  if v_battle.defender_user_id <> v_caller then
    raise exception 'NOT_YOUR_INVITE';
  end if;

  if v_battle.status <> 'pending_invite' then
    raise exception 'BATTLE_NOT_PENDING';
  end if;

  update public.battles
  set
    status = 'aborted',
    abort_reason = 'invite_declined',
    ended_at = now()
  where id = p_battle_id;

  perform public.release_battle_lock(p_battle_id, true);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.decline_battle_invite(uuid) to authenticated;

create or replace function public.advance_battle_question(p_battle_id uuid)
returns void as $$
declare
  v_battle public.battles%rowtype;
  v_per_question_timeout_seconds integer;
  v_reveal_offset_ms integer;
  v_reveal_offset interval;
  v_winner_user_id uuid;
begin
  select *
  into v_battle
  from public.battles
  where id = p_battle_id
  for update;

  if v_battle.id is null or v_battle.status <> 'in_progress' then
    return;
  end if;

  select
    coalesce((settings_json->>'per_question_timeout_seconds')::integer, 15),
    coalesce((settings_json->>'reveal_offset_ms')::integer, 200)
  into v_per_question_timeout_seconds, v_reveal_offset_ms
  from public.activities
  where id = v_battle.activity_id;

  if v_battle.current_index >= 5 then
    if v_battle.challenger_score >= v_battle.defender_score then
      v_winner_user_id := v_battle.challenger_user_id;
    else
      v_winner_user_id := v_battle.defender_user_id;
    end if;

    update public.battles
    set
      status = 'finished',
      winner_user_id = v_winner_user_id,
      ended_at = now()
    where id = p_battle_id;

    perform public.apply_battle_result(p_battle_id, v_winner_user_id);
    return;
  end if;

  v_reveal_offset := (v_reveal_offset_ms::text || ' milliseconds')::interval;

  update public.battles
  set
    reveal_at = now() + v_reveal_offset,
    question_deadline_at = now() + v_reveal_offset + make_interval(secs => v_per_question_timeout_seconds),
    current_index_decided = false
  where id = p_battle_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.advance_battle_question(uuid) to service_role;
