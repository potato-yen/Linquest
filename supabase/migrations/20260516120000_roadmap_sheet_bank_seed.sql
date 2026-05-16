-- 20260516120000_roadmap_sheet_bank_seed.sql
-- roadmap §2.2 / phase-1 sheet-source design §7:
-- Questions now come from a Google Sheet, so there is no questions-bearing
-- question_banks row. roadmap_progress.bank_id still has a NOT NULL FK to
-- question_banks(id). This seeds ONE fixed-UUID official row to anchor that
-- FK. roadmap_config is null on purpose — the level↔stage mapping lives in
-- code (lib/roadmap/roadmap-config.ts). Idempotent and additive.
insert into public.question_banks (id, name, source, language, roadmap_config)
values (
  '0ad0ad0a-0000-4000-8000-000000000001'::uuid,
  'Roadmap (Google Sheet)',
  'official',
  'en',
  null
)
on conflict (id) do nothing;
