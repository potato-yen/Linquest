create table public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_teacher_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  class_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create index class_members_user_idx on public.class_members(user_id);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;

create policy "teacher can read own classes"
  on public.classes for select
  using (owner_teacher_id = auth.uid());

create policy "members can read classes they belong to"
  on public.classes for select
  using (
    exists (
      select 1
      from public.class_members
      where class_members.class_id = classes.id
        and class_members.user_id = auth.uid()
    )
  );

create policy "teacher can manage own classes"
  on public.classes for all
  using (owner_teacher_id = auth.uid())
  with check (owner_teacher_id = auth.uid());

create policy "members read own membership rows"
  on public.class_members for select
  using (user_id = auth.uid());

create policy "teacher reads members of own classes"
  on public.class_members for select
  using (
    exists (
      select 1
      from public.classes
      where classes.id = class_members.class_id
        and classes.owner_teacher_id = auth.uid()
    )
  );

create policy "user can self-join class via code"
  on public.class_members for insert
  with check (user_id = auth.uid());
