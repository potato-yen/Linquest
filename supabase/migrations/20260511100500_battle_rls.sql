alter table public.battles enable row level security;

create policy "battle players read own battles"
  on public.battles for select
  using (
    auth.uid() = challenger_user_id
    or auth.uid() = defender_user_id
  );

create policy "teacher reads activity battles"
  on public.battles for select
  using (
    exists (
      select 1
      from public.activities a
      join public.classes c on c.id = a.class_id
      where a.id = battles.activity_id
        and c.owner_teacher_id = auth.uid()
    )
  );
