-- Phase 5 teacher console backend: custom-bank read RLS + roster + create/delete activity RPCs.
-- Spec: docs/superpowers/specs/2026-05-17-teacher-console-backend-additions.md ; SPEC.md §0 (2026-05-17).

-- ===== A. RLS: class members can read their activity's custom-bank questions =====
create or replace function public.auth_uid_can_read_custom_bank(p_bank_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.activities a
    join public.question_banks qb on qb.id = a.question_bank_id
    where a.question_bank_id = p_bank_id
      and qb.source = 'custom'
      and public.auth_uid_in_class(a.class_id)
  );
$$;

revoke all on function public.auth_uid_can_read_custom_bank(uuid) from public;
grant execute on function public.auth_uid_can_read_custom_bank(uuid) to authenticated, service_role;

create policy "members read custom bank questions"
  on public.questions for select
  using (public.auth_uid_can_read_custom_bank(questions.bank_id));

-- ===== B. list_class_roster =====
create or replace function public.list_class_roster(p_class_id uuid)
returns table (user_id uuid, display_name text, joined_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.auth_uid_owns_class(p_class_id) then
    return;
  end if;

  return query
    select cm.user_id, u.display_name, cm.joined_at
    from public.class_members cm
    join public.users u on u.id = cm.user_id
    where cm.class_id = p_class_id
    order by cm.joined_at asc;
end;
$$;

revoke all on function public.list_class_roster(uuid) from public;
grant execute on function public.list_class_roster(uuid) to authenticated, service_role;

-- ===== C. create_activity_with_custom_bank =====
create or replace function public.create_activity_with_custom_bank(
  p_class_id uuid,
  p_name text,
  p_ends_at timestamptz,
  p_group_count integer,
  p_map_size_target integer,
  p_refresh_interval_hours integer,
  p_bank_name text,
  p_rows jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_activity_id uuid := gen_random_uuid();
  v_bank_id uuid := gen_random_uuid();
  v_row jsonb;
  v_difficulty text;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.auth_uid_owns_class(p_class_id) then
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

  if p_rows is null
     or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) = 0 then
    raise exception 'INVALID_CUSTOM_BANK_ROWS';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_difficulty := coalesce(v_row->'meta'->>'difficulty', 'standard');

    if coalesce(v_row->>'prompt', '') = ''
       or coalesce(v_row->>'correct_answer', '') = ''
       or jsonb_typeof(v_row->'distractors') <> 'array'
       or jsonb_array_length(v_row->'distractors') <> 3
       or v_difficulty not in ('standard', 'advanced')
       or exists (
         select 1
         from jsonb_array_elements(v_row->'distractors') d(value)
         where jsonb_typeof(d.value) <> 'string'
            or coalesce(d.value #>> '{}', '') = ''
       ) then
      raise exception 'INVALID_CUSTOM_BANK_ROWS';
    end if;
  end loop;

  insert into public.question_banks (id, name, source, language)
  values (v_bank_id, p_bank_name, 'custom', 'en');

  insert into public.questions (bank_id, prompt, correct_answer, distractors, meta)
  select
    v_bank_id,
    elem->>'prompt',
    elem->>'correct_answer',
    array(select jsonb_array_elements_text(elem->'distractors')),
    jsonb_build_object('difficulty', coalesce(elem->'meta'->>'difficulty', 'standard'))
  from jsonb_array_elements(p_rows) elem;

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
    v_bank_id,
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
$$;

revoke all on function public.create_activity_with_custom_bank(
  uuid, text, timestamptz, integer, integer, integer, text, jsonb
) from public;
grant execute on function public.create_activity_with_custom_bank(
  uuid, text, timestamptz, integer, integer, integer, text, jsonb
) to authenticated, service_role;

-- ===== D. delete_activity =====
create or replace function public.delete_activity(p_activity_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_class_id uuid;
  v_bank_id uuid;
  v_bank_source public.bank_source;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select a.class_id, a.question_bank_id
  into v_class_id, v_bank_id
  from public.activities a
  where a.id = p_activity_id;

  if v_class_id is null then
    raise exception 'ACTIVITY_NOT_FOUND';
  end if;

  if not public.auth_uid_owns_class(v_class_id) then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  delete from public.attempts where activity_id = p_activity_id;
  delete from public.territory_events where activity_id = p_activity_id;
  delete from public.battles where activity_id = p_activity_id;
  delete from public.hex_tiles
    where map_id in (select id from public.maps where activity_id = p_activity_id);
  delete from public.maps where activity_id = p_activity_id;
  delete from public.refresh_waves where activity_id = p_activity_id;
  delete from public.group_members
    where group_id in (select id from public.groups where activity_id = p_activity_id);
  delete from public.groups where activity_id = p_activity_id;
  delete from public.activities where id = p_activity_id;

  if v_bank_id is not null then
    select qb.source
    into v_bank_source
    from public.question_banks qb
    where qb.id = v_bank_id;

    if v_bank_source = 'custom' then
      delete from public.questions where bank_id = v_bank_id;
      delete from public.question_banks where id = v_bank_id;
    end if;
  end if;
end;
$$;

revoke all on function public.delete_activity(uuid) from public;
grant execute on function public.delete_activity(uuid) to authenticated, service_role;
