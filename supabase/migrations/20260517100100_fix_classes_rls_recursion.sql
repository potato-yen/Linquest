-- Fix: infinite recursion (42P17) between classes and class_members RLS.
--
--   classes."members can read classes they belong to"  → SELECT class_members
--   class_members."teacher reads members of own classes" → SELECT classes
--   → classes → class_members → classes → … infinite recursion.
--
-- This mutual reference has existed since 20260506100100_init_classes.sql.
-- Because activities / maps / hex_tiles / groups / group_members RLS all
-- resolve through classes or class_members, this single cycle poisons every
-- authenticated territory query. (Backend integration tests didn't catch it
-- because they run with the service_role key, which bypasses RLS.)
--
-- Fix: SECURITY DEFINER helper functions read the other table WITHOUT
-- triggering its RLS, breaking the mutual reference in both directions.
-- Semantics are identical to the original policies — only the recursion is
-- removed. Companion to 20260517100000 (which broke the group_members cycle).

create or replace function public.auth_uid_in_class(p_class_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.auth_uid_in_class(uuid) to authenticated;

create or replace function public.auth_uid_owns_class(p_class_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.classes
    where id = p_class_id
      and owner_teacher_id = auth.uid()
  );
$$;

grant execute on function public.auth_uid_owns_class(uuid) to authenticated;

-- Break the cycle on the classes side (was: EXISTS SELECT FROM class_members).
drop policy if exists "members can read classes they belong to" on public.classes;
create policy "members can read classes they belong to"
  on public.classes for select
  using ( public.auth_uid_in_class(id) );

-- Break the cycle on the class_members side (was: EXISTS SELECT FROM classes).
drop policy if exists "teacher reads members of own classes" on public.class_members;
create policy "teacher reads members of own classes"
  on public.class_members for select
  using ( public.auth_uid_owns_class(class_id) );
