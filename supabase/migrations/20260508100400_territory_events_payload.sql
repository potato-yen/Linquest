alter table public.attempts
  add constraint attempts_activity_fk
  foreign key (activity_id) references public.activities(id) on delete set null;

alter table public.attempts
  add constraint attempts_tile_fk
  foreign key (tile_id) references public.hex_tiles(id) on delete set null;

alter table public.territory_events
  add constraint territory_events_activity_fk
  foreign key (activity_id) references public.activities(id) on delete cascade;

alter table public.territory_events
  add constraint territory_events_group_fk
  foreign key (group_id) references public.groups(id) on delete set null;

alter table public.territory_events
  add constraint territory_events_user_fk
  foreign key (user_id) references public.users(id) on delete set null;

alter table public.territory_events
  add constraint territory_events_tile_fk
  foreign key (tile_id) references public.hex_tiles(id) on delete set null;

create index territory_events_group_eventtype_idx
  on public.territory_events(activity_id, group_id, event_type)
  where group_id is not null;
