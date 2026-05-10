create or replace function public.attempt_capture(
  p_activity_id uuid,
  p_user_id uuid,
  p_tile_id uuid,
  p_cost integer,
  p_lock_seconds integer,
  p_is_battle boolean
) returns table (challenge_id uuid, tile jsonb) as $$
declare
  v_activity public.activities%rowtype;
  v_tile public.hex_tiles%rowtype;
  v_group_id uuid;
  v_treasury integer;
  v_now timestamptz := now();
  v_challenge_id uuid := gen_random_uuid();
begin
  select * into v_activity
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
    and gm.user_id = p_user_id
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

  if v_treasury < p_cost then
    raise exception 'INSUFFICIENT_TREASURY';
  end if;

  update public.groups
  set treasury = treasury - p_cost
  where id = v_group_id;

  if p_is_battle then
    update public.hex_tiles
    set
      active_battle_id = v_challenge_id,
      active_challenge_user_id = p_user_id,
      active_challenge_until = null
    where id = p_tile_id;
  else
    update public.hex_tiles
    set
      active_challenge_user_id = p_user_id,
      active_challenge_until = v_now + make_interval(secs => p_lock_seconds),
      active_battle_id = null
    where id = p_tile_id;
  end if;

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
    p_user_id,
    'challenge_cost',
    -p_cost,
    jsonb_build_object('challenge_id', v_challenge_id, 'is_battle', p_is_battle)
  );

  select *
  into v_tile
  from public.hex_tiles
  where id = p_tile_id;

  return query
  select v_challenge_id, to_jsonb(v_tile);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.attempt_capture(uuid, uuid, uuid, integer, integer, boolean) from public;
grant execute on function public.attempt_capture(uuid, uuid, uuid, integer, integer, boolean) to authenticated;
grant execute on function public.attempt_capture(uuid, uuid, uuid, integer, integer, boolean) to service_role;
