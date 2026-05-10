create or replace function public.release_battle_lock(
  p_battle_id uuid,
  p_refund boolean
) returns void as $$
declare
  v_battle public.battles%rowtype;
  v_tile public.hex_tiles%rowtype;
  v_activity public.activities%rowtype;
  v_cost integer;
  v_challenger_group_id uuid;
begin
  select *
  into v_battle
  from public.battles
  where id = p_battle_id;

  if v_battle.id is null then
    return;
  end if;

  select *
  into v_tile
  from public.hex_tiles
  where id = v_battle.tile_id
  for update;

  if v_tile.id is null then
    return;
  end if;

  if v_tile.active_battle_id = p_battle_id then
    update public.hex_tiles
    set
      active_battle_id = null,
      active_challenge_id = null,
      active_challenge_kind = null,
      active_challenge_user_id = null,
      active_challenge_until = null
    where id = v_tile.id;
  end if;

  if not p_refund then
    return;
  end if;

  select *
  into v_activity
  from public.activities
  where id = v_battle.activity_id;

  if exists (
    select 1
    from public.territory_events
    where event_type = 'challenge_cost'
      and payload->>'battle_id' = p_battle_id::text
      and coalesce((payload->>'refund')::boolean, false)
  ) then
    return;
  end if;

  v_cost := coalesce((v_activity.settings_json->>'cost_special')::integer, 50);

  select g.id
  into v_challenger_group_id
  from public.group_members gm
  join public.groups g on g.id = gm.group_id
  where gm.user_id = v_battle.challenger_user_id
    and g.activity_id = v_battle.activity_id
  limit 1;

  if v_challenger_group_id is null then
    return;
  end if;

  update public.groups
  set treasury = treasury + v_cost
  where id = v_challenger_group_id;

  insert into public.territory_events (
    activity_id,
    tile_id,
    group_id,
    user_id,
    event_type,
    score_delta,
    payload
  ) values (
    v_battle.activity_id,
    v_tile.id,
    v_challenger_group_id,
    v_battle.challenger_user_id,
    'challenge_cost',
    v_cost,
    jsonb_build_object('battle_id', p_battle_id, 'refund', true, 'kind', 'capture_special')
  );
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.release_battle_lock(uuid, boolean) to service_role;

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

  select *
  into v_battle
  from public.battles
  where id = p_battle_id;

  if v_battle.id is null then
    return;
  end if;

  select *
  into v_tile
  from public.hex_tiles
  where id = v_battle.tile_id
  for update;

  if v_tile.id is null then
    return;
  end if;

  select *
  into v_activity
  from public.activities
  where id = v_battle.activity_id;

  select g.id
  into v_winner_group_id
  from public.group_members gm
  join public.groups g on g.id = gm.group_id
  where gm.user_id = p_winner_user_id
    and g.activity_id = v_battle.activity_id
  limit 1;

  if v_winner_group_id is null then
    return;
  end if;

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

  insert into public.territory_events (
    activity_id,
    tile_id,
    group_id,
    user_id,
    event_type,
    score_delta,
    payload
  ) values (
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

grant execute on function public.apply_battle_result(uuid, uuid) to service_role;
