-- Fix: "發佈活動會顯示發生未知錯誤" — publishing a draft activity always fails.
--
-- The publish flow is FE-orchestrated (lib/territory/generator.ts
-- initializeMap): the logged-in teacher's client writes directly to
--   INSERT public.maps        (new map row)
--   INSERT public.hex_tiles   (every tile)
--   UPDATE public.groups      (starting treasury + capital seed)
--
-- But territory RLS (20260508100900 / 20260508100200) enabled RLS on these
-- tables with ONLY a SELECT policy. With RLS on and no INSERT/UPDATE policy,
-- Postgres denies the write for the `authenticated` role, so the very first
-- `INSERT INTO maps` is rejected. The PostgREST RLS error carries no
-- teacher-console code, so parseTeacherConsoleRpcCode() collapses it to
-- UNKNOWN_TEACHER_CONSOLE_ERROR → the UI shows "發生未知錯誤，請稍後再試。"
--
-- Backend integration tests didn't catch this because they run with the
-- service_role key (bypasses RLS); the phase-5 teacher console is the first
-- real authenticated client to reach initializeMap. (Same hazard class as the
-- 20260517100000 / 20260517100100 recursion fixes.)
--
-- Fix: owner-scoped INSERT/UPDATE policies, with the cross-table ownership
-- check wrapped in SECURITY DEFINER helpers (RLS Design Rule — never inline
-- EXISTS across activities/classes here, to stay clear of the recently-fixed
-- classes ↔ class_members cycle). snapshot_class_and_create_groups /
-- finalize_activity_publish / rollback_activity_publish / run_refresh_wave
-- are SECURITY DEFINER and already bypass RLS, so they need nothing here.

create or replace function public.auth_uid_owns_activity(p_activity_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.activities a
    join public.classes c on c.id = a.class_id
    where a.id = p_activity_id
      and c.owner_teacher_id = auth.uid()
  );
$$;

grant execute on function public.auth_uid_owns_activity(uuid) to authenticated;

create or replace function public.auth_uid_owns_map(p_map_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.maps m
    join public.activities a on a.id = m.activity_id
    join public.classes c on c.id = a.class_id
    where m.id = p_map_id
      and c.owner_teacher_id = auth.uid()
  );
$$;

grant execute on function public.auth_uid_owns_map(uuid) to authenticated;

-- maps: owning teacher may create the activity's map.
drop policy if exists "owner writes maps of own activity" on public.maps;
create policy "owner writes maps of own activity"
  on public.maps for insert
  with check ( public.auth_uid_owns_activity(activity_id) );

-- hex_tiles: owning teacher may seed the tiles of that map.
drop policy if exists "owner writes tiles of own map" on public.hex_tiles;
create policy "owner writes tiles of own map"
  on public.hex_tiles for insert
  with check ( public.auth_uid_owns_map(map_id) );

-- groups: owning teacher may set starting treasury / capital seed at publish.
drop policy if exists "owner updates groups of own activity" on public.groups;
create policy "owner updates groups of own activity"
  on public.groups for update
  using ( public.auth_uid_owns_activity(activity_id) )
  with check ( public.auth_uid_owns_activity(activity_id) );
