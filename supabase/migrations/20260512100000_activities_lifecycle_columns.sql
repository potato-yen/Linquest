alter table public.activities
  add column sudden_death_started_at timestamptz;

comment on column public.activities.sudden_death_started_at is
  'First time neutral_count reached zero. Effective end is least(ends_at, sudden_death_started_at + 12h).';

alter table public.activities
  alter column starts_at drop not null;

do $$
declare
  v_constraint_name text;
begin
  select con.conname
  into v_constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'activities'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%ends_at > starts_at%';

  if v_constraint_name is not null then
    execute format(
      'alter table public.activities drop constraint %I',
      v_constraint_name
    );
  end if;
end;
$$;

alter table public.activities
  add constraint activities_starts_before_ends
  check (starts_at is null or ends_at > starts_at);
