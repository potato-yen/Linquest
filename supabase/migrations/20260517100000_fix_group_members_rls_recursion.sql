-- Fix: infinite recursion (42P17) in group_members RLS policy.
--
-- The original policy "members read own group rosters" queried group_members
-- from within its own USING clause, causing Postgres to recurse indefinitely:
--   group_members policy → SELECT FROM group_members → policy → …
--
-- Fix strategy:
--   1. Create a SECURITY DEFINER function that reads group_members without
--      triggering its own RLS (runs as function owner, bypassing row-level security).
--   2. Rewrite group_members policy to use a simple user_id = auth.uid() check
--      for the student case (was the self-referential EXISTS).
--   3. Rewrite groups policy to use the SECURITY DEFINER function, breaking
--      any groups → group_members → groups chain.

-- Step 1: helper function that checks group membership without triggering RLS.
create or replace function public.auth_uid_in_group(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.auth_uid_in_group(uuid) to authenticated;

-- Step 2: fix group_members policy (remove self-referential EXISTS).
drop policy if exists "members read own group rosters" on public.group_members;
create policy "members read own group rosters"
  on public.group_members for select
  using (
    -- student: their own membership row
    user_id = auth.uid()
    or
    -- teacher: any member of a group in their own activities
    exists (
      select 1
      from public.groups g
      join public.activities a on a.id = g.activity_id
      join public.classes c on c.id = a.class_id
      where g.id = group_members.group_id
        and c.owner_teacher_id = auth.uid()
    )
  );

-- Step 3: fix groups policy to use SECURITY DEFINER function.
-- The original policy did EXISTS (SELECT FROM group_members) which, combined
-- with the self-referential group_members policy, could loop via any chain
-- that reaches both tables.
drop policy if exists "members read own groups" on public.groups;
create policy "members read own groups"
  on public.groups for select
  using (
    -- student: check via SECURITY DEFINER (no group_members RLS triggered)
    public.auth_uid_in_group(id)
    or
    -- teacher: direct ownership via activity → class chain
    exists (
      select 1
      from public.activities a
      join public.classes c on c.id = a.class_id
      where a.id = groups.activity_id
        and c.owner_teacher_id = auth.uid()
    )
  );
