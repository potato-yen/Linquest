-- Enforce the territory-authoritative minimum custom-bank size.
--
-- A teacher activity bank must be large enough to support the largest
-- territory challenge shape in v1: reverse 3x = 18 questions. Keep the
-- existing distinct-answer rule as a separate validation because custom-bank
-- distractors are still sampled from sibling answers at runtime.

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
  v_pos jsonb;
  v_row_count integer;
  v_distinct_answers integer;
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
    v_pos := v_row->'meta'->'part_of_speech';
    if coalesce(v_row->>'prompt', '') = ''
       or coalesce(v_row->>'correct_answer', '') = ''
       or (v_pos is not null
           and jsonb_typeof(v_pos) not in ('string', 'null')) then
      raise exception 'INVALID_CUSTOM_BANK_ROWS';
    end if;
  end loop;

  v_row_count := jsonb_array_length(p_rows);
  if v_row_count < 18 then
    raise exception 'INSUFFICIENT_CUSTOM_BANK_ROWS';
  end if;

  select count(distinct elem->>'correct_answer')
    into v_distinct_answers
  from jsonb_array_elements(p_rows) elem;

  if v_distinct_answers < 4 then
    raise exception 'INSUFFICIENT_DISTINCT_ANSWERS';
  end if;

  insert into public.question_banks (id, name, source, language)
  values (v_bank_id, p_bank_name, 'custom', 'en');

  insert into public.questions (bank_id, prompt, correct_answer, distractors, meta)
  select
    v_bank_id,
    elem->>'prompt',
    elem->>'correct_answer',
    array['', '', '']::text[],
    jsonb_strip_nulls(jsonb_build_object(
      'part_of_speech', nullif(elem->'meta'->>'part_of_speech', ''),
      'difficulty', 'standard'
    ))
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
) to authenticated;
