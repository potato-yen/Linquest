-- Support Roadmap attempts and other non-standard question sources.
-- roadmap spec §2: questions are from Google Sheets/CSV and don't exist in public.questions.
-- This migration allows attempts to be recorded without a valid UUID question_id.

alter table public.attempts alter column question_id drop not null;

comment on column public.attempts.question_id is 'Optional. Reference to public.questions.id for territory/battle modes. Null for roadmap or external sources.';

alter table public.attempts add column if not exists stable_question_id text;
comment on column public.attempts.stable_question_id is 'Required for roadmap mode. Stable string ID of the question (e.g. from Google Sheet).';

create index if not exists attempts_stable_question_idx on public.attempts(stable_question_id) where stable_question_id is not null;
