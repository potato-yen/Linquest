-- Fix RLS policies to allow all participants in an activity to see all groups and members.
-- This ensures that tile ownership visuals and leaderboards are complete for all students.

-- 1. Update public.groups policy
drop policy if exists "members read own groups" on public.groups;

create policy "activity participants read all groups"
  on public.groups for select
  using (
    exists (
      select 1
      from public.activities a
      join public.class_members cm on cm.class_id = a.class_id
      where a.id = groups.activity_id
        and cm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.activities a
      join public.classes c on c.id = a.class_id
      where a.id = groups.activity_id
        and c.owner_teacher_id = auth.uid()
    )
  );

-- 2. Update public.group_members policy
drop policy if exists "members read own group rosters" on public.group_members;

create policy "activity participants read all rosters"
  on public.group_members for select
  using (
    exists (
      select 1
      from public.groups g
      join public.activities a on a.id = g.activity_id
      join public.class_members cm on cm.class_id = a.class_id
      where g.id = group_members.group_id
        and cm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.groups g
      join public.activities a on a.id = g.activity_id
      join public.classes c on c.id = a.class_id
      where g.id = group_members.group_id
        and c.owner_teacher_id = auth.uid()
    )
  );

-- 3. Update public.users policy to allow class members to see each other
-- This ensures names are visible in presence lists and stats.
drop policy if exists "class members can see each other" on public.users;
create policy "class members can see each other"
  on public.users for select
  using (
    exists (
      select 1
      from public.class_members cm1
      join public.class_members cm2 on cm1.class_id = cm2.class_id
      where cm1.user_id = auth.uid()
        and cm2.user_id = users.id
    )
    or exists (
      select 1
      from public.classes c
      where c.owner_teacher_id = auth.uid()
    )
  );
