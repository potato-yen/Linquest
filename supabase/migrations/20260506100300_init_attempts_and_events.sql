create type public.attempt_context as enum ('territory', 'roadmap', 'battle');

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  activity_id uuid,
  context public.attempt_context not null,
  tile_id uuid,
  battle_id uuid,
  is_correct boolean not null,
  response_ms integer not null check (response_ms >= 0),
  answered_at timestamptz not null default now()
);

create index attempts_user_idx on public.attempts(user_id);
create index attempts_activity_idx on public.attempts(activity_id) where activity_id is not null;

create type public.territory_event_type as enum (
  'capture',
  'reverse_attack_win',
  'reverse_attack_fail',
  'multiplier_self_recapture',
  'refresh_buff_applied',
  'refresh_buff_expired',
  'tax_tick',
  'challenge_cost'
);

create table public.territory_events (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  tile_id uuid,
  group_id uuid,
  user_id uuid,
  event_type public.territory_event_type not null,
  score_delta integer not null default 0,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index territory_events_activity_idx on public.territory_events(activity_id);
create index territory_events_group_idx on public.territory_events(group_id) where group_id is not null;

alter table public.attempts enable row level security;
alter table public.territory_events enable row level security;

create policy "user reads own attempts"
  on public.attempts for select
  using (user_id = auth.uid());

create policy "user inserts own attempts"
  on public.attempts for insert
  with check (user_id = auth.uid());
