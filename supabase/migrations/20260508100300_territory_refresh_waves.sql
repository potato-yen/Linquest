create type public.refresh_policy as enum ('normal', 'endgame_all_special');

create table public.refresh_waves (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  wave_index integer not null,
  fired_at timestamptz not null default now(),
  multiplier_ratio real not null,
  special_ratio real not null,
  policy public.refresh_policy not null default 'normal',
  affected_tile_ids uuid[] not null default '{}'::uuid[],
  previous_special_tile_ids uuid[] not null default '{}'::uuid[],
  unique (activity_id, wave_index)
);

create index refresh_waves_activity_idx on public.refresh_waves(activity_id);

alter table public.hex_tiles
  add constraint hex_tiles_refresh_wave_fk
  foreign key (last_refresh_wave_id) references public.refresh_waves(id) on delete set null;
