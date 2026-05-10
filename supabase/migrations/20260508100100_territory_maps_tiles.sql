create type public.tile_kind as enum ('normal', 'multiplier', 'special');

create table public.maps (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null unique references public.activities(id) on delete cascade,
  width integer not null,
  height integer not null,
  tile_layout_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.hex_tiles (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  q integer not null,
  r integer not null,
  kind public.tile_kind not null default 'normal',
  multiplier integer check (multiplier in (2, 3)),
  owner_group_id uuid,
  is_capital boolean not null default false,
  protected_until timestamptz,
  active_challenge_user_id uuid references public.users(id) on delete set null,
  active_challenge_until timestamptz,
  active_battle_id uuid,
  last_refresh_wave_id uuid,
  last_taken_at timestamptz,
  created_at timestamptz not null default now(),
  unique (map_id, q, r),
  check ((kind = 'multiplier' and multiplier in (2, 3)) or (kind <> 'multiplier' and multiplier is null))
);

create index hex_tiles_map_idx on public.hex_tiles(map_id);
create index hex_tiles_owner_idx on public.hex_tiles(owner_group_id) where owner_group_id is not null;
create index hex_tiles_active_lock_idx
  on public.hex_tiles(map_id)
  where active_challenge_until is not null or active_battle_id is not null;

alter table public.activities
  add column map_id uuid references public.maps(id) on delete set null;
