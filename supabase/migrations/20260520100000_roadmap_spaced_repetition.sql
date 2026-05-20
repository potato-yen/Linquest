-- roadmap spaced repetition (memory curve) support.
-- spec: roadmap-spaced-repetition.md

-- 1. roadmap_mastery: tracks mastery level and next review date per question.
create table if not exists public.roadmap_mastery (
  user_id uuid not null references public.users(id) on delete cascade,
  bank_id uuid not null references public.question_banks(id) on delete cascade,
  question_id text not null, -- matches the 'id' column in Google Sheet
  mastery_level integer not null default 0 check (mastery_level >= 0 and mastery_level <= 5),
  next_review_at timestamptz not null default now(),
  last_interval_days numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, bank_id, question_id)
);

comment on table public.roadmap_mastery is 'Tracks student mastery and next review dates for roadmap questions using spaced repetition.';

create index if not exists roadmap_mastery_user_idx on public.roadmap_mastery(user_id);
create index if not exists roadmap_mastery_next_review_idx on public.roadmap_mastery(next_review_at);

-- 2. Trigger to update updated_at
create or replace function public.roadmap_mastery_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists roadmap_mastery_set_updated_at_trg on public.roadmap_mastery;
create trigger roadmap_mastery_set_updated_at_trg
  before update on public.roadmap_mastery
  for each row execute function public.roadmap_mastery_set_updated_at();

-- 3. RLS Policies
alter table public.roadmap_mastery enable row level security;

drop policy if exists "user reads own mastery" on public.roadmap_mastery;
create policy "user reads own mastery"
  on public.roadmap_mastery for select
  using (user_id = auth.uid());

drop policy if exists "user inserts own mastery" on public.roadmap_mastery;
create policy "user inserts own mastery"
  on public.roadmap_mastery for insert
  with check (user_id = auth.uid());

drop policy if exists "user updates own mastery" on public.roadmap_mastery;
create policy "user updates own mastery"
  on public.roadmap_mastery for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
