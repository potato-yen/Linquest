# Linquest

Vocabulary learning app combining teacher-led territory battles with personalised roadmap practice.

## Status

Project skeleton in progress. Core reference docs:

- `SPEC.md` — master architecture and product scope
- `docs/territory-spec.md` — territory rules and financial model
- `docs/design-language.md` — visual direction

## Environment

Fill `.env` with your hosted Supabase project values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

## Schema

SQL migrations live under `supabase/migrations/`.
Apply them in your Supabase project with the SQL editor or your preferred migration workflow.

## App Layout

- `app/` — Expo Router route stubs
- `components/` — shared UI components
- `lib/` — service modules and pure logic
- `supabase/migrations/` — schema SQL
- `supabase/seed/` — sample content files
- `tests/` — Jest unit tests
- `docs/` — specs and implementation plans

## Commands

```bash
npm install
npm test
npx expo start --web
```

## Collaboration

See `docs/codex-onboarding.md`.
