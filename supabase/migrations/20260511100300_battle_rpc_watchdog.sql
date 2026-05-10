create or replace function public.expire_battle_invites()
returns integer as $$
declare
  v_count integer := 0;
  v_battle record;
begin
  for v_battle in
    select b.id
    from public.battles b
    join public.activities a on a.id = b.activity_id
    where b.status = 'pending_invite'
      and now() > b.created_at + make_interval(
        mins => coalesce((a.settings_json->>'battle_invite_timeout_minutes')::integer, 5)
      )
  loop
    update public.battles
    set
      status = 'aborted',
      abort_reason = 'invite_timeout',
      ended_at = now()
    where id = v_battle.id;

    perform public.release_battle_lock(v_battle.id, false);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.expire_battle_invites() to service_role;

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
    where id = v_battle_id;

    perform public.advance_battle_question(v_battle_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.expire_battle_questions() to service_role;

create or replace function public.expire_battle_disconnects()
returns integer as $$
declare
  v_count integer := 0;
  v_now timestamptz := now();
  v_battle record;
  v_grace_seconds integer;
  v_challenger_stale boolean;
  v_defender_stale boolean;
  v_tile_active_battle_id uuid;
begin
  for v_battle in
    select b.*, a.settings_json
    from public.battles b
    join public.activities a on a.id = b.activity_id
    where b.status = 'in_progress'
  loop
    select active_battle_id
    into v_tile_active_battle_id
    from public.hex_tiles
    where id = v_battle.tile_id;

    if v_tile_active_battle_id is distinct from v_battle.id then
      update public.battles
      set
        status = 'aborted',
        abort_reason = 'tile_locked_externally',
        ended_at = v_now
      where id = v_battle.id;

      perform public.release_battle_lock(v_battle.id, true);
      v_count := v_count + 1;
      continue;
    end if;

    v_grace_seconds := coalesce(
      (v_battle.settings_json->>'heartbeat_grace_seconds')::integer,
      60
    );

    v_challenger_stale := v_battle.challenger_last_heartbeat_at is null
      or v_now - v_battle.challenger_last_heartbeat_at > make_interval(secs => v_grace_seconds);
    v_defender_stale := v_battle.defender_last_heartbeat_at is null
      or v_now - v_battle.defender_last_heartbeat_at > make_interval(secs => v_grace_seconds);

    if v_challenger_stale and v_defender_stale then
      update public.battles
      set
        status = 'aborted',
        abort_reason = 'both_disconnected',
        ended_at = v_now
      where id = v_battle.id;

      perform public.release_battle_lock(v_battle.id, false);
      v_count := v_count + 1;
    elsif v_challenger_stale then
      update public.battles
      set
        status = 'finished',
        winner_user_id = v_battle.defender_user_id,
        ended_at = v_now
      where id = v_battle.id;

      perform public.apply_battle_result(v_battle.id, v_battle.defender_user_id);
      v_count := v_count + 1;
    elsif v_defender_stale then
      update public.battles
      set
        status = 'finished',
        winner_user_id = v_battle.challenger_user_id,
        ended_at = v_now
      where id = v_battle.id;

      perform public.apply_battle_result(v_battle.id, v_battle.challenger_user_id);
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.expire_battle_disconnects() to service_role;

create or replace function public.sweep_orphan_battle_locks()
returns integer as $$
declare
  v_count integer := 0;
  v_tile record;
begin
  for v_tile in
    select t.id, t.active_battle_id
    from public.hex_tiles t
    join public.battles b on b.id = t.active_battle_id
    where b.status in ('finished', 'aborted')
  loop
    perform public.release_battle_lock(v_tile.active_battle_id, false);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.sweep_orphan_battle_locks() to service_role;
