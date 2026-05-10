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
    select count(*) into v_owned
    from public.hex_tiles
    where owner_group_id = v_group.id;

    select count(*) into v_capital
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

revoke all on function public.run_tax_tick(uuid, integer, integer, timestamptz) from public;
grant execute on function public.run_tax_tick(uuid, integer, integer, timestamptz) to service_role;
