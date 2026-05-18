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

revoke all on function public.send_battle_invite(uuid, uuid, uuid) from public;
grant execute on function public.send_battle_invite(uuid, uuid, uuid) to authenticated;
