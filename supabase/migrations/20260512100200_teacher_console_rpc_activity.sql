create or replace function public.create_activity_draft(
  p_class_id uuid,
  p_name text,
  p_ends_at timestamptz,
  p_question_bank_id uuid,
  p_group_count integer,
  p_map_size_target integer,
  p_refresh_interval_hours integer
) returns uuid as $$
declare
  v_activity_id uuid := gen_random_uuid();
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (
    select 1
    from public.classes
    where id = p_class_id
      and owner_teacher_id = v_user_id
  ) then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  if p_ends_at <= now() + interval '5 minutes' then
    raise exception 'INVALID_ENDS_AT';
  end if;

  if p_group_count < 2 or p_group_count > 10 then
    raise exception 'INVALID_GROUP_COUNT';
  end if;

  if p_map_size_target < 50 or p_map_size_target > 120 then
    raise exception 'INVALID_MAP_SIZE';
  end if;

  if p_refresh_interval_hours not in (6, 8, 12, 24) then
    raise exception 'INVALID_REFRESH_INTERVAL';
  end if;

  if not exists (
    select 1
    from public.question_banks
    where id = p_question_bank_id
  ) then
    raise exception 'QUESTION_BANK_NOT_FOUND';
  end if;

  insert into public.activities (
    id,
    class_id,
    name,
    question_bank_id,
    starts_at,
    ends_at,
    status,
    settings_json
  ) values (
    v_activity_id,
    p_class_id,
    p_name,
    p_question_bank_id,
    null,
    p_ends_at,
    'draft',
    jsonb_build_object(
      'group_count', p_group_count,
      'map_size_target', p_map_size_target,
      'refresh_interval_hours', p_refresh_interval_hours
    )
  );

  return v_activity_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.snapshot_class_and_create_groups(
  p_activity_id uuid
) returns table (group_id uuid, member_count integer) as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
  v_member_ids uuid[];
  v_group_count integer;
  v_groups jsonb;
  v_group jsonb;
  v_created_group_id uuid;
  v_group_index integer;
  v_color_palette text[] := array[
    '#7E5A3A', '#5A7E3A', '#3A5A7E', '#7E3A5A', '#3A7E5A',
    '#7E7E3A', '#3A7E7E', '#7E3A3A', '#5A3A7E', '#3A3A7E'
  ];
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select a.*
  into v_activity
  from public.activities a
  join public.classes c on c.id = a.class_id
  where a.id = p_activity_id
    and c.owner_teacher_id = v_user_id
  for update;

  if v_activity.id is null then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  if v_activity.status <> 'draft' then
    raise exception 'ACTIVITY_NOT_DRAFT';
  end if;

  if exists (
    select 1
    from public.groups
    where activity_id = p_activity_id
  ) then
    raise exception 'GROUPS_ALREADY_EXIST';
  end if;

  select array_agg(cm.user_id order by cm.joined_at, cm.user_id)
  into v_member_ids
  from public.class_members cm
  where cm.class_id = v_activity.class_id;

  v_group_count := coalesce((v_activity.settings_json->>'group_count')::integer, 0);
  v_groups := public.compute_balanced_groups(v_member_ids, v_group_count);

  for v_group in select * from jsonb_array_elements(v_groups)
  loop
    v_group_index := (v_group->>'index')::integer;

    insert into public.groups (
      activity_id,
      name,
      color
    ) values (
      p_activity_id,
      format('%s組', v_group_index),
      v_color_palette[v_group_index]
    )
    returning id into v_created_group_id;

    insert into public.group_members (group_id, user_id)
    select
      v_created_group_id,
      member_id::uuid
    from jsonb_array_elements_text(v_group->'members') as member_id;

    group_id := v_created_group_id;
    member_count := jsonb_array_length(v_group->'members');
    return next;
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.finalize_activity_publish(
  p_activity_id uuid
) returns void as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
  v_refresh_interval integer;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select a.*
  into v_activity
  from public.activities a
  join public.classes c on c.id = a.class_id
  where a.id = p_activity_id
    and c.owner_teacher_id = v_user_id
  for update;

  if v_activity.id is null then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  if v_activity.status <> 'draft' then
    raise exception 'ACTIVITY_NOT_DRAFT';
  end if;

  if v_activity.map_id is null then
    raise exception 'MAP_NOT_READY';
  end if;

  v_refresh_interval := coalesce((v_activity.settings_json->>'refresh_interval_hours')::integer, 12);

  update public.activities
  set
    status = 'active',
    starts_at = v_now,
    next_refresh_at = v_now + make_interval(hours => v_refresh_interval),
    next_tax_at = v_now + interval '1 hour'
  where id = p_activity_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.rollback_activity_publish(
  p_activity_id uuid
) returns void as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select a.*
  into v_activity
  from public.activities a
  join public.classes c on c.id = a.class_id
  where a.id = p_activity_id
    and c.owner_teacher_id = v_user_id
  for update;

  if v_activity.id is null then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  delete from public.groups where activity_id = p_activity_id;
  delete from public.maps where activity_id = p_activity_id;

  update public.activities
  set
    map_id = null,
    status = 'draft',
    starts_at = null,
    next_refresh_at = null,
    next_tax_at = null
  where id = p_activity_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.end_activity_now(
  p_activity_id uuid
) returns void as $$
declare
  v_activity public.activities%rowtype;
  v_user_id uuid := auth.uid();
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

  if v_activity.status <> 'active' then
    raise exception 'ACTIVITY_NOT_ACTIVE';
  end if;

  perform public.settle_activity(p_activity_id);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.list_my_activities(
  p_class_id uuid default null
) returns table (
  id uuid,
  name text,
  status public.activity_status,
  class_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  sudden_death_started_at timestamptz,
  effective_end_at timestamptz
) as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  return query
  select
    a.id,
    a.name,
    a.status,
    a.class_id,
    a.starts_at,
    a.ends_at,
    a.sudden_death_started_at,
    case
      when a.starts_at is null then null
      when a.sudden_death_started_at is null then a.ends_at
      else least(a.ends_at, a.sudden_death_started_at + interval '12 hours')
    end as effective_end_at
  from public.activities a
  join public.classes c on c.id = a.class_id
  where c.owner_teacher_id = v_user_id
    and (p_class_id is null or a.class_id = p_class_id)
  order by a.created_at desc;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.create_activity_draft(uuid, text, timestamptz, uuid, integer, integer, integer) from public;
revoke all on function public.snapshot_class_and_create_groups(uuid) from public;
revoke all on function public.finalize_activity_publish(uuid) from public;
revoke all on function public.rollback_activity_publish(uuid) from public;
revoke all on function public.end_activity_now(uuid) from public;
revoke all on function public.list_my_activities(uuid) from public;

grant execute on function public.create_activity_draft(uuid, text, timestamptz, uuid, integer, integer, integer) to authenticated, service_role;
grant execute on function public.snapshot_class_and_create_groups(uuid) to authenticated, service_role;
grant execute on function public.finalize_activity_publish(uuid) to authenticated, service_role;
grant execute on function public.rollback_activity_publish(uuid) to authenticated, service_role;
grant execute on function public.end_activity_now(uuid) to authenticated, service_role;
grant execute on function public.list_my_activities(uuid) to authenticated, service_role;
