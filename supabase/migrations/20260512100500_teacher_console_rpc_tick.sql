create or replace function public.tick_activity_lifecycle()
returns jsonb as $$
declare
  v_sudden_death_started integer := 0;
  v_ended_count integer := 0;
  v_activity_id uuid;
begin
  with updated as (
    update public.activities a
    set sudden_death_started_at = now()
    where a.status = 'active'
      and a.sudden_death_started_at is null
      and not exists (
        select 1
        from public.hex_tiles h
        join public.maps m on m.id = h.map_id
        where m.activity_id = a.id
          and h.owner_group_id is null
          and h.is_capital = false
      )
    returning 1
  )
  select count(*)::integer into v_sudden_death_started
  from updated;

  for v_activity_id in
    select id
    from public.activities
    where status = 'active'
      and now() >= least(
        ends_at,
        coalesce(
          sudden_death_started_at + interval '12 hours',
          'infinity'::timestamptz
        )
      )
  loop
    perform public.settle_activity(v_activity_id);
    v_ended_count := v_ended_count + 1;
  end loop;

  return jsonb_build_object(
    'sudden_death_started', v_sudden_death_started,
    'ended', v_ended_count
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.tick_activity_lifecycle() from public;
grant execute on function public.tick_activity_lifecycle() to service_role;
