create type public.bank_source as enum ('official', 'custom');

create table public.question_banks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source public.bank_source not null default 'official',
  language text not null default 'en',
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  bank_id uuid not null references public.question_banks(id) on delete cascade,
  prompt text not null,
  correct_answer text not null,
  distractors text[] not null check (array_length(distractors, 1) = 3),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index questions_bank_idx on public.questions(bank_id);
create index questions_difficulty_idx
  on public.questions ((meta->>'difficulty'))
  where meta ? 'difficulty';

alter table public.question_banks enable row level security;
alter table public.questions enable row level security;

create policy "authenticated users read official banks"
  on public.question_banks for select
  using (auth.role() = 'authenticated' and source = 'official');

create policy "authenticated users read official bank questions"
  on public.questions for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.question_banks
      where question_banks.id = questions.bank_id
        and question_banks.source = 'official'
    )
  );
