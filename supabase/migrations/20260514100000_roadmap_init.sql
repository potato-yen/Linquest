-- roadmap module bootstrap.
-- spec: docs/roadmap-spec.md §2.

-- 1. question_banks.roadmap_config: per-bank level->stage range mapping.
alter table public.question_banks
  add column if not exists roadmap_config jsonb null;

comment on column public.question_banks.roadmap_config is
  'roadmap spec §2.2: level → stage range mapping. null = bank does not support roadmap. Shape: {"levels":[{"level":1,"stage_start":1,"stage_end":30},...]}.';

-- 2. roadmap_progress: per-user per-bank stage progression.
create table if not exists public.roadmap_progress (
  user_id uuid not null references public.users(id) on delete cascade,
  bank_id uuid not null references public.question_banks(id) on delete cascade,
  current_stage integer not null default 1 check (current_stage >= 1),
  updated_at timestamptz not null default now(),
  primary key (user_id, bank_id)
);

comment on table public.roadmap_progress is
  'roadmap spec §2.1: per-user per-bank stage progression. current_stage = next playable stage (= last_unlocked + 1). After clearing last_stage, current_stage = last_stage + 1 (completion sentinel).';

comment on column public.roadmap_progress.current_stage is
  'Next playable stage. Initial = 1. After clearing the final stage, equals last_stage + 1 (no actual stage; UI shows completion).';

create index if not exists roadmap_progress_user_idx on public.roadmap_progress(user_id);

-- 3. Trigger: progress is monotonic non-decreasing. Multi-device race or client bug cannot regress.
create or replace function public.roadmap_progress_no_regress()
returns trigger language plpgsql as $$
begin
  if new.current_stage < old.current_stage then
    new.current_stage := old.current_stage;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists roadmap_progress_no_regress_trg on public.roadmap_progress;
create trigger roadmap_progress_no_regress_trg
  before update on public.roadmap_progress
  for each row execute function public.roadmap_progress_no_regress();

-- 4. RLS: students can only read/insert/update their own row. No delete policy = no delete.
alter table public.roadmap_progress enable row level security;

drop policy if exists "user reads own progress" on public.roadmap_progress;
create policy "user reads own progress"
  on public.roadmap_progress for select
  using (user_id = auth.uid());

drop policy if exists "user inserts own progress" on public.roadmap_progress;
create policy "user inserts own progress"
  on public.roadmap_progress for insert
  with check (user_id = auth.uid());

drop policy if exists "user updates own progress" on public.roadmap_progress;
create policy "user updates own progress"
  on public.roadmap_progress for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
