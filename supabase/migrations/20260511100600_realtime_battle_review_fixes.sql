create or replace function public.expire_battle_questions()
returns integer as $$
declare
  v_count integer := 0;
  v_battle_id uuid;
begin
  for v_battle_id in
    select id
    from public.battles
    where status = 'in_progress'
      and question_deadline_at is not null
      and now() > question_deadline_at
  loop
    update public.battles
    set current_index = current_index + 1
    where id = v_battle_id
      and status = 'in_progress'
      and question_deadline_at is not null
      and now() > question_deadline_at;

    if found then
      perform public.advance_battle_question(v_battle_id);
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.sweep_orphan_battle_locks()
returns integer as $$
declare
  v_count integer := 0;
  v_tile record;
begin
  for v_tile in
    select
      t.id,
      t.active_battle_id,
      b.abort_reason
    from public.hex_tiles t
    join public.battles b on b.id = t.active_battle_id
    where b.status in ('finished', 'aborted')
  loop
    perform public.release_battle_lock(
      v_tile.active_battle_id,
      v_tile.abort_reason in ('invite_declined', 'tile_locked_externally')
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$ language plpgsql security definer set search_path = public;
