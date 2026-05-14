-- Add an expression index for roadmap level question selection.
-- roadmap service filters by bank_id and meta->>'roadmap_level'.

create index if not exists questions_roadmap_level_idx
  on public.questions ((meta->>'roadmap_level'))
  where meta ? 'roadmap_level';
