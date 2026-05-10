alter table public.maps enable row level security;
alter table public.hex_tiles enable row level security;
alter table public.refresh_waves enable row level security;
alter table public.territory_events enable row level security;

create policy "members read maps of own activity"
  on public.maps for select
  using (
    exists (
      select 1
      from public.activities a
      join public.classes c on c.id = a.class_id
      where a.id = maps.activity_id
        and (
          c.owner_teacher_id = auth.uid()
          or exists (
            select 1
            from public.class_members cm
            where cm.class_id = c.id
              and cm.user_id = auth.uid()
          )
        )
    )
  );

create policy "members read tiles of own activity"
  on public.hex_tiles for select
  using (
    exists (
      select 1
      from public.maps m
      join public.activities a on a.id = m.activity_id
      join public.classes c on c.id = a.class_id
      where m.id = hex_tiles.map_id
        and (
          c.owner_teacher_id = auth.uid()
          or exists (
            select 1
            from public.class_members cm
            where cm.class_id = c.id
              and cm.user_id = auth.uid()
          )
        )
    )
  );

create policy "members read refresh waves of own activity"
  on public.refresh_waves for select
  using (
    exists (
      select 1
      from public.activities a
      join public.classes c on c.id = a.class_id
      where a.id = refresh_waves.activity_id
        and (
          c.owner_teacher_id = auth.uid()
          or exists (
            select 1
            from public.class_members cm
            where cm.class_id = c.id
              and cm.user_id = auth.uid()
          )
        )
    )
  );

create policy "members read territory events of own activity"
  on public.territory_events for select
  using (
    exists (
      select 1
      from public.activities a
      join public.classes c on c.id = a.class_id
      where a.id = territory_events.activity_id
        and (
          c.owner_teacher_id = auth.uid()
          or exists (
            select 1
            from public.class_members cm
            where cm.class_id = c.id
              and cm.user_id = auth.uid()
          )
        )
    )
  );
