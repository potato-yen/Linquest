create type public.battle_status as enum (
  'pending_invite',
  'in_progress',
  'finished',
  'aborted'
);

create type public.battle_abort_reason as enum (
  'invite_declined',
  'invite_timeout',
  'both_disconnected',
  'tile_locked_externally'
);

create table public.battles (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  tile_id uuid not null references public.hex_tiles(id) on delete cascade,
  challenger_user_id uuid not null references public.users(id) on delete cascade,
  defender_user_id uuid not null references public.users(id) on delete cascade,
  status public.battle_status not null default 'pending_invite',
  question_ids uuid[] not null,
  current_index integer not null default 0,
  current_index_decided boolean not null default false,
  reveal_at timestamptz,
  question_deadline_at timestamptz,
  challenger_score integer not null default 0,
  defender_score integer not null default 0,
  challenger_locked integer[] not null default '{}'::integer[],
  defender_locked integer[] not null default '{}'::integer[],
  challenger_last_heartbeat_at timestamptz,
  defender_last_heartbeat_at timestamptz,
  winner_user_id uuid references public.users(id) on delete set null,
  abort_reason public.battle_abort_reason,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint battles_question_ids_len check (array_length(question_ids, 1) = 5),
  constraint battles_current_index_range check (current_index between 0 and 5),
  constraint battles_distinct_players check (challenger_user_id <> defender_user_id),
  constraint battles_terminal_fields check (
    (status in ('finished', 'aborted')) = (ended_at is not null)
  )
);

create index battles_activity_status_idx
  on public.battles(activity_id, status);

create index battles_defender_pending_idx
  on public.battles(defender_user_id)
  where status = 'pending_invite';

create index battles_question_deadline_idx
  on public.battles(question_deadline_at)
  where status = 'in_progress';

create index battles_heartbeat_idx
  on public.battles(challenger_last_heartbeat_at, defender_last_heartbeat_at)
  where status = 'in_progress';
