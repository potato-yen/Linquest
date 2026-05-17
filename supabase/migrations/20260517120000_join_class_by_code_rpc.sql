-- Fix: student "join class by code" always fails with the generic
-- "發生未知錯誤" on the frontend.
--
-- Cause: the frontend joinByCode() resolved the class code by running
--   SELECT id FROM classes WHERE class_code = ?
-- as the logged-in student. The only SELECT policies on public.classes are
-- "teacher can read own classes" (owner = auth.uid()) and "members can read
-- classes they belong to" (auth_uid_in_class(id)). A student who has not
-- joined yet is neither, so RLS filters the row out, maybeSingle() returns
-- null, and the wrapper throws "class ... not found" → mapError → unknown.
--
-- Chicken-and-egg: you must be a member to read the class, but you must read
-- the class to learn the id needed to become a member. Backend integration
-- tests run with the service_role key (RLS bypassed), so they never hit it.
--
-- Fix: a SECURITY DEFINER RPC resolves the code WITHOUT triggering classes
-- RLS and self-inserts membership idempotently. Mirrors the project's
-- hard-won RLS rule (wrap cross-table access in SECURITY DEFINER) and the
-- existing auth_uid_in_class / list_class_roster pattern.

create or replace function public.join_class_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_class_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select id into v_class_id
  from public.classes
  where class_code = upper(trim(p_code));

  if v_class_id is null then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  insert into public.class_members (class_id, user_id)
  values (v_class_id, v_uid)
  on conflict (class_id, user_id) do nothing;

  return v_class_id;
end;
$$;

grant execute on function public.join_class_by_code(text) to authenticated;
