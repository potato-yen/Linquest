create table public.groups (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  name text not null,
  color text not null default '#7c8a5a',
  treasury integer not null default 0,
  capital_seed_q integer,
  capital_seed_r integer,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index groups_activity_idx on public.groups(activity_id);
create index group_members_user_idx on public.group_members(user_id);

alter table public.hex_tiles
  add constraint hex_tiles_owner_group_fk
  foreign key (owner_group_id) references public.groups(id) on delete set null;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "members read own groups"
  on public.groups for select
  using (
    exists (
      select 1
      from public.group_members gm
      where gm.group_id = groups.id
        and gm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.activities a
      join public.classes c on c.id = a.class_id
      where a.id = groups.activity_id
        and c.owner_teacher_id = auth.uid()
    )
  );

create policy "members read own group rosters"
  on public.group_members for select
  using (
    exists (
      select 1
      from public.group_members gm2
      where gm2.group_id = group_members.group_id
        and gm2.user_id = auth.uid()
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
