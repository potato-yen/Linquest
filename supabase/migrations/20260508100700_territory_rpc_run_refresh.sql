create or replace function public.run_refresh_wave(
  p_activity_id uuid,
  p_multiplier_targets jsonb,
  p_special_targets jsonb,
  p_policy text,
  p_previous_special_tile_ids jsonb,
  p_refresh_interval_seconds integer
) returns uuid as $$
declare
  v_wave_id uuid := gen_random_uuid();
  v_wave_index integer;
  v_map_id uuid;
  v_total_tiles integer;
  v_now timestamptz := now();
  v_next_refresh timestamptz := v_now + make_interval(secs => p_refresh_interval_seconds);
  v_target jsonb;
  v_tile_id uuid;
begin
  select map_id into v_map_id
  from public.activities
  where id = p_activity_id;

  if v_map_id is null then
    raise exception 'INVALID_REFRESH';
  end if;

  select coalesce(max(wave_index), -1) + 1 into v_wave_index
  from public.refresh_waves
  where activity_id = p_activity_id;

  select count(*) into v_total_tiles
  from public.hex_tiles
  where map_id = v_map_id;

  insert into public.refresh_waves (
    id,
    activity_id,
    wave_index,
    fired_at,
    multiplier_ratio,
    special_ratio,
    policy,
    previous_special_tile_ids
  ) values (
    v_wave_id,
    p_activity_id,
    v_wave_index,
    v_now,
    coalesce(jsonb_array_length(p_multiplier_targets)::real / nullif(v_total_tiles, 0), 0),
    coalesce(jsonb_array_length(p_special_targets)::real / nullif(v_total_tiles, 0), 0),
    p_policy::public.refresh_policy,
    coalesce(
      array(
        select jsonb_array_elements_text(coalesce(p_previous_special_tile_ids, '[]'::jsonb))::uuid
      ),
      '{}'::uuid[]
    )
  );

  insert into public.territory_events (activity_id, tile_id, event_type, payload)
  select
    p_activity_id,
    ht.id,
    'refresh_buff_expired',
    jsonb_build_object('wave_id', v_wave_id, 'kind', 'multiplier')
  from public.hex_tiles ht
  where ht.map_id = v_map_id
    and ht.kind = 'multiplier';

  update public.hex_tiles
  set
    kind = 'normal',
    multiplier = null
  where map_id = v_map_id
    and kind = 'multiplier';

  insert into public.territory_events (activity_id, tile_id, event_type, payload)
  select
    p_activity_id,
    ht.id,
    'refresh_buff_expired',
    jsonb_build_object('wave_id', v_wave_id, 'kind', 'special')
  from public.hex_tiles ht
  where ht.map_id = v_map_id
    and ht.kind = 'special';

  update public.hex_tiles
  set
    kind = 'normal',
    multiplier = null,
    protected_until = null
  where map_id = v_map_id
    and kind = 'special';

  for v_target in select * from jsonb_array_elements(coalesce(p_multiplier_targets, '[]'::jsonb))
  loop
    v_tile_id := (v_target->>'tile_id')::uuid;

    update public.hex_tiles
    set
      kind = 'multiplier',
      multiplier = (v_target->>'multiplier')::integer,
      last_refresh_wave_id = v_wave_id
    where id = v_tile_id
      and map_id = v_map_id
      and is_capital = false;

    insert into public.territory_events (activity_id, tile_id, event_type, payload)
    values (
      p_activity_id,
      v_tile_id,
      'refresh_buff_applied',
      jsonb_build_object(
        'wave_id',
        v_wave_id,
        'kind',
        'multiplier',
        'multiplier',
        (v_target->>'multiplier')::integer
      )
    );
  end loop;

  for v_target in select * from jsonb_array_elements(coalesce(p_special_targets, '[]'::jsonb))
  loop
    v_tile_id := trim(both '"' from v_target::text)::uuid;

    update public.hex_tiles
    set
      kind = 'special',
      multiplier = null,
      last_refresh_wave_id = v_wave_id
    where id = v_tile_id
      and map_id = v_map_id
      and is_capital = false
      and owner_group_id is null;

    insert into public.territory_events (activity_id, tile_id, event_type, payload)
    values (
      p_activity_id,
      v_tile_id,
      'refresh_buff_applied',
      jsonb_build_object('wave_id', v_wave_id, 'kind', 'special')
    );
  end loop;

  update public.refresh_waves
  set affected_tile_ids = (
    select coalesce(array_agg(id), '{}'::uuid[])
    from public.hex_tiles
    where last_refresh_wave_id = v_wave_id
  )
  where id = v_wave_id;

  update public.activities
  set next_refresh_at = v_next_refresh
  where id = p_activity_id;

  return v_wave_id;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.run_refresh_wave(uuid, jsonb, jsonb, text, jsonb, integer) from public;
grant execute on function public.run_refresh_wave(uuid, jsonb, jsonb, text, jsonb, integer) to service_role;
