create or replace function public.get_activity_common_mistakes(
  p_activity_id uuid,
  p_limit integer default 10
) returns table (
  question_id uuid,
  prompt text,
  wrong_count integer
) as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 50));
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

  return query
  select
    q.id as question_id,
    q.prompt,
    count(*)::integer as wrong_count
  from public.attempts a
  join public.questions q on q.id = a.question_id
  where a.activity_id = p_activity_id
    and a.is_correct = false
  group by q.id, q.prompt
  order by wrong_count desc, q.prompt asc
  limit v_limit;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.get_activity_accuracy(
  p_activity_id uuid
) returns jsonb as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
  v_overall_attempts integer := 0;
  v_overall_correct integer := 0;
  v_territory_attempts integer := 0;
  v_territory_correct integer := 0;
  v_battle_attempts integer := 0;
  v_battle_correct integer := 0;
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

  select
    count(*)::integer,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer
  into v_overall_attempts, v_overall_correct
  from public.attempts
  where activity_id = p_activity_id;

  select
    count(*)::integer,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer
  into v_territory_attempts, v_territory_correct
  from public.attempts
  where activity_id = p_activity_id
    and context = 'territory';

  select
    count(*)::integer,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::integer
  into v_battle_attempts, v_battle_correct
  from public.attempts
  where activity_id = p_activity_id
    and context = 'battle';

  return jsonb_build_object(
    'overall', jsonb_build_object(
      'attempts', v_overall_attempts,
      'correct', v_overall_correct,
      'accuracy', case
        when v_overall_attempts = 0 then 0
        else v_overall_correct::numeric / v_overall_attempts
      end
    ),
    'by_context', jsonb_build_object(
      'territory', jsonb_build_object(
        'attempts', v_territory_attempts,
        'correct', v_territory_correct,
        'accuracy', case
          when v_territory_attempts = 0 then 0
          else v_territory_correct::numeric / v_territory_attempts
        end
      ),
      'battle', jsonb_build_object(
        'attempts', v_battle_attempts,
        'correct', v_battle_correct,
        'accuracy', case
          when v_battle_attempts = 0 then 0
          else v_battle_correct::numeric / v_battle_attempts
        end
      )
    )
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.get_activity_settlement(
  p_activity_id uuid
) returns jsonb as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
  v_rankings_treasury jsonb;
  v_rankings_territory jsonb;
  v_common_mistakes jsonb;
  v_accuracy jsonb;
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

  if v_activity.status <> 'ended' then
    raise exception 'ACTIVITY_NOT_ENDED';
  end if;

  select coalesce(jsonb_agg(row_data order by (row_data->>'rank')::integer), '[]'::jsonb)
  into v_rankings_treasury
  from (
    select jsonb_build_object(
      'group_id', ranked.id,
      'name', ranked.name,
      'color', ranked.color,
      'treasury', ranked.treasury,
      'rank', ranked.rank
    ) as row_data
    from (
      select
        g.id,
        g.name,
        g.color,
        g.treasury,
        row_number() over (order by g.treasury desc, g.name asc) as rank
      from public.groups g
      where g.activity_id = p_activity_id
    ) ranked
  ) treasury_rows;

  select coalesce(jsonb_agg(row_data order by (row_data->>'rank')::integer), '[]'::jsonb)
  into v_rankings_territory
  from (
    select jsonb_build_object(
      'group_id', ranked.id,
      'name', ranked.name,
      'color', ranked.color,
      'owned_count', ranked.owned_count,
      'rank', ranked.rank
    ) as row_data
    from (
      select
        g.id,
        g.name,
        g.color,
        coalesce(tile_counts.owned_count, 0) as owned_count,
        row_number() over (order by coalesce(tile_counts.owned_count, 0) desc, g.name asc) as rank
      from public.groups g
      left join (
        select owner_group_id as group_id, count(*)::integer as owned_count
        from public.hex_tiles
        where map_id = v_activity.map_id
          and owner_group_id is not null
        group by owner_group_id
      ) tile_counts on tile_counts.group_id = g.id
      where g.activity_id = p_activity_id
    ) ranked
  ) territory_rows;

  select coalesce(jsonb_agg(to_jsonb(mistakes_row)), '[]'::jsonb)
  into v_common_mistakes
  from public.get_activity_common_mistakes(p_activity_id, 10) as mistakes_row;

  v_accuracy := public.get_activity_accuracy(p_activity_id);

  return jsonb_build_object(
    'rankings_treasury', coalesce(v_rankings_treasury, '[]'::jsonb),
    'rankings_territory', coalesce(v_rankings_territory, '[]'::jsonb),
    'common_mistakes', coalesce(v_common_mistakes, '[]'::jsonb),
    'accuracy', v_accuracy
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.get_activity_common_mistakes(uuid, integer) from public;
revoke all on function public.get_activity_accuracy(uuid) from public;
revoke all on function public.get_activity_settlement(uuid) from public;

grant execute on function public.get_activity_common_mistakes(uuid, integer) to authenticated, service_role;
grant execute on function public.get_activity_accuracy(uuid) to authenticated, service_role;
grant execute on function public.get_activity_settlement(uuid) to authenticated, service_role;
