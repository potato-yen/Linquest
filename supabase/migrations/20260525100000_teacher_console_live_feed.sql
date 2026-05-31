create or replace function public.get_activity_live_feed(
  p_activity_id uuid,
  p_limit integer default 50
) returns table (
  id uuid,
  occurred_at timestamptz,
  event_type public.territory_event_type,
  user_id uuid,
  user_display_name text,
  group_id uuid,
  group_name text,
  group_color text,
  tile_id uuid,
  score_delta integer,
  payload jsonb
) as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- Security check: user must be the teacher of the class owning this activity
  if not exists (
    select 1
    from public.activities a
    join public.classes c on c.id = a.class_id
    where a.id = p_activity_id
      and c.owner_teacher_id = v_user_id
  ) then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  return query
  select
    te.id,
    te.occurred_at,
    te.event_type,
    te.user_id,
    u.display_name as user_display_name,
    te.group_id,
    g.name as group_name,
    g.color as group_color,
    te.tile_id,
    te.score_delta,
    te.payload
  from public.territory_events te
  left join public.users u on u.id = te.user_id
  left join public.groups g on g.id = te.group_id
  where te.activity_id = p_activity_id
  order by te.occurred_at desc
  limit v_limit;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.get_activity_student_stats(
  p_activity_id uuid
) returns table (
  user_id uuid,
  display_name text,
  group_name text,
  group_color text,
  total_attempts integer,
  correct_attempts integer,
  accuracy numeric,
  last_active_at timestamptz
) as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (
    select 1
    from public.activities a
    join public.classes c on c.id = a.class_id
    where a.id = p_activity_id
      and c.owner_teacher_id = v_user_id
  ) then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  return query
  with user_stats as (
    select
      att.user_id,
      count(*)::integer as total_attempts,
      sum(case when att.is_correct then 1 else 0 end)::integer as correct_attempts,
      max(att.answered_at) as last_active_at
    from public.attempts att
    where att.activity_id = p_activity_id
    group by att.user_id
  )
  select
    u.id as user_id,
    u.display_name,
    g.name as group_name,
    g.color as group_color,
    coalesce(s.total_attempts, 0) as total_attempts,
    coalesce(s.correct_attempts, 0) as correct_attempts,
    case
      when coalesce(s.total_attempts, 0) = 0 then 0
      else (s.correct_attempts::numeric / s.total_attempts)
    end as accuracy,
    s.last_active_at
  from public.class_members cm
  join public.users u on u.id = cm.user_id
  join public.activities a on a.class_id = cm.class_id
  left join user_stats s on s.user_id = u.id
  left join public.group_members gm on gm.user_id = u.id
  left join public.groups g on g.id = gm.group_id and g.activity_id = p_activity_id
  where a.id = p_activity_id
  order by accuracy desc, total_attempts desc;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.get_activity_live_feed(uuid, integer) from public;
grant execute on function public.get_activity_live_feed(uuid, integer) to authenticated, service_role;

revoke all on function public.get_activity_student_stats(uuid) from public;
grant execute on function public.get_activity_student_stats(uuid) to authenticated, service_role;
