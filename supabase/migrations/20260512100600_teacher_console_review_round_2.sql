create or replace function public.get_activity_dashboard(
  p_activity_id uuid
) returns jsonb as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
  v_effective_end_at timestamptz;
  v_time_remaining integer;
  v_groups jsonb;
  v_map_summary jsonb;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select a.*
  into v_activity
  from public.activities a
  join public.classes c on c.id = a.class_id
  where a.id = p_activity_id
    and c.owner_teacher_id = v_user_id;

  if v_activity.id is null then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  if v_activity.status not in ('active', 'ended') then
    raise exception 'ACTIVITY_NOT_ACTIVE';
  end if;

  v_effective_end_at := case
    when v_activity.sudden_death_started_at is null
      then v_activity.ends_at
    else least(v_activity.ends_at, v_activity.sudden_death_started_at + interval '12 hours')
  end;
  v_time_remaining := greatest(0, floor(extract(epoch from (v_effective_end_at - now())))::integer);

  select coalesce(jsonb_agg(group_row order by group_sort_index), '[]'::jsonb)
  into v_groups
  from (
    select
      jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'color', g.color,
        'treasury', g.treasury,
        'owned_count', coalesce(tile_counts.owned_count, 0),
        'member_count', coalesce(member_counts.member_count, 0)
      ) as group_row,
      coalesce(nullif(regexp_replace(g.name, '\D', '', 'g'), ''), '0')::integer as group_sort_index
    from public.groups g
    left join (
      select owner_group_id as group_id, count(*)::integer as owned_count
      from public.hex_tiles
      where map_id = v_activity.map_id
        and owner_group_id is not null
      group by owner_group_id
    ) tile_counts on tile_counts.group_id = g.id
    left join (
      select group_id, count(*)::integer as member_count
      from public.group_members
      group by group_id
    ) member_counts on member_counts.group_id = g.id
    where g.activity_id = p_activity_id
  ) grouped;

  select jsonb_build_object(
    'total_tiles', count(*)::integer,
    'neutral_count', count(*) filter (where owner_group_id is null)::integer,
    'capital_count', count(*) filter (where is_capital)::integer,
    'special_count', count(*) filter (where kind = 'special')::integer,
    'multiplier_count', count(*) filter (where kind = 'multiplier')::integer
  )
  into v_map_summary
  from public.hex_tiles
  where map_id = v_activity.map_id;

  return jsonb_build_object(
    'activity', jsonb_build_object(
      'id', v_activity.id,
      'name', v_activity.name,
      'status', v_activity.status,
      'starts_at', v_activity.starts_at,
      'ends_at', v_activity.ends_at,
      'sudden_death_started_at', v_activity.sudden_death_started_at,
      'effective_end_at', v_effective_end_at,
      'time_remaining_seconds', case when v_activity.status = 'ended' then 0 else v_time_remaining end
    ),
    'groups', coalesce(v_groups, '[]'::jsonb),
    'map_summary', coalesce(
      v_map_summary,
      jsonb_build_object(
        'total_tiles', 0,
        'neutral_count', 0,
        'capital_count', 0,
        'special_count', 0,
        'multiplier_count', 0
      )
    )
  );
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

  if v_activity.id is null then
    raise exception 'ACTIVITY_NOT_ACTIVE';
  end if;

  if v_activity.status <> 'active' then
    return;
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
