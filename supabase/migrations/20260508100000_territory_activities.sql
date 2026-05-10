create type public.activity_status as enum ('draft', 'active', 'ended');

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  name text not null,
  question_bank_id uuid not null references public.question_banks(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status public.activity_status not null default 'draft',
  settings_json jsonb not null default '{}'::jsonb,
  next_refresh_at timestamptz,
  next_tax_at timestamptz,
  created_at timestamptz not null default now()
);

create index activities_class_idx on public.activities(class_id);
create index activities_status_idx on public.activities(status) where status = 'active';

alter table public.activities enable row level security;

create policy "teacher manages own class activities"
  on public.activities for all
  using (
    exists (
      select 1
      from public.classes c
      where c.id = activities.class_id
        and c.owner_teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.classes c
      where c.id = activities.class_id
        and c.owner_teacher_id = auth.uid()
    )
  );

create policy "students read activities of joined classes"
  on public.activities for select
  using (
    exists (
      select 1
      from public.class_members cm
      where cm.class_id = activities.class_id
        and cm.user_id = auth.uid()
    )
  );
