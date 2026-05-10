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

  if v_activity.id is null then
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

grant execute on function public.settle_activity(uuid) to service_role;
