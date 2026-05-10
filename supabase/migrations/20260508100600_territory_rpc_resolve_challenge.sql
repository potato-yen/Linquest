create or replace function public.resolve_challenge(
  p_activity_id uuid,
  p_tile_id uuid,
  p_user_id uuid,
  p_challenge_id uuid,
  p_kind text,
  p_all_correct boolean,
  p_success_reward integer,
  p_fail_attacker_delta integer,
  p_fail_defender_delta integer,
  p_apply_cooldown_seconds integer,
  p_special_protected_until timestamptz
) returns void as $$
declare
  v_tile public.hex_tiles%rowtype;
  v_attacker_group_id uuid;
  v_defender_group_id uuid;
  v_now timestamptz := now();
  v_event_type public.territory_event_type;
  v_cooldown_until timestamptz;
begin
  select *
  into v_tile
  from public.hex_tiles
  where id = p_tile_id
  for update;

  if v_tile.id is null then
    raise exception 'TILE_NOT_FOUND';
  end if;

  if v_tile.active_challenge_user_id is distinct from p_user_id then
    raise exception 'CHALLENGE_USER_MISMATCH';
  end if;

  select g.id
  into v_attacker_group_id
  from public.groups g
  join public.group_members gm on gm.group_id = g.id
  where g.activity_id = p_activity_id
    and gm.user_id = p_user_id
  limit 1;

  if v_attacker_group_id is null then
    raise exception 'NOT_GROUP_MEMBER';
  end if;

  v_defender_group_id := v_tile.owner_group_id;
  if p_apply_cooldown_seconds > 0 then
    v_cooldown_until := v_now + make_interval(secs => p_apply_cooldown_seconds);
  else
    v_cooldown_until := null;
  end if;

  if p_all_correct then
    if p_kind = 'capture_normal' then
      update public.hex_tiles
      set
        owner_group_id = v_attacker_group_id,
        protected_until = v_cooldown_until,
        last_taken_at = v_now,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'capture';
    elsif p_kind = 'reverse_normal' then
      update public.hex_tiles
      set
        owner_group_id = v_attacker_group_id,
        protected_until = v_cooldown_until,
        last_taken_at = v_now,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'reverse_attack_win';
    elsif p_kind = 'capture_multiplier' then
      update public.hex_tiles
      set
        owner_group_id = v_attacker_group_id,
        kind = 'normal',
        multiplier = null,
        protected_until = v_cooldown_until,
        last_taken_at = v_now,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'capture';
    elsif p_kind = 'reverse_multiplier' then
      update public.hex_tiles
      set
        owner_group_id = v_attacker_group_id,
        kind = 'normal',
        multiplier = null,
        protected_until = v_cooldown_until,
        last_taken_at = v_now,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'reverse_attack_win';
    elsif p_kind = 'self_recapture_multiplier' then
      update public.hex_tiles
      set
        kind = 'normal',
        multiplier = null,
        protected_until = v_cooldown_until,
        last_taken_at = v_now,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'multiplier_self_recapture';
    elsif p_kind = 'capture_special' then
      update public.hex_tiles
      set
        owner_group_id = v_attacker_group_id,
        protected_until = p_special_protected_until,
        last_taken_at = v_now,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
      v_event_type := 'capture';
    else
      raise exception 'INVALID_CHALLENGE_KIND';
    end if;

    update public.groups
    set treasury = treasury + p_success_reward
    where id = v_attacker_group_id;

    insert into public.territory_events (
      activity_id,
      tile_id,
      group_id,
      user_id,
      event_type,
      score_delta,
      payload
    ) values (
      p_activity_id,
      p_tile_id,
      v_attacker_group_id,
      p_user_id,
      v_event_type,
      p_success_reward,
      jsonb_build_object('challenge_id', p_challenge_id, 'kind', p_kind)
    );
  else
    if p_kind in ('reverse_normal', 'reverse_multiplier') then
      update public.hex_tiles
      set
        protected_until = v_cooldown_until,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;

      if p_fail_attacker_delta <> 0 then
        update public.groups
        set treasury = treasury + p_fail_attacker_delta
        where id = v_attacker_group_id;

        insert into public.territory_events (
          activity_id,
          tile_id,
          group_id,
          user_id,
          event_type,
          score_delta,
          payload
        ) values (
          p_activity_id,
          p_tile_id,
          v_attacker_group_id,
          p_user_id,
          'reverse_attack_fail',
          p_fail_attacker_delta,
          jsonb_build_object('challenge_id', p_challenge_id, 'kind', p_kind)
        );
      end if;

      if v_defender_group_id is not null and p_fail_defender_delta <> 0 then
        update public.groups
        set treasury = treasury + p_fail_defender_delta
        where id = v_defender_group_id;

        insert into public.territory_events (
          activity_id,
          tile_id,
          group_id,
          user_id,
          event_type,
          score_delta,
          payload
        ) values (
          p_activity_id,
          p_tile_id,
          v_defender_group_id,
          null,
          'reverse_attack_fail',
          p_fail_defender_delta,
          jsonb_build_object('challenge_id', p_challenge_id, 'kind', p_kind, 'role', 'defender_bonus')
        );
      end if;
    elsif p_kind = 'self_recapture_multiplier' then
      update public.hex_tiles
      set
        kind = 'normal',
        multiplier = null,
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
    else
      update public.hex_tiles
      set
        active_challenge_user_id = null,
        active_challenge_until = null,
        active_battle_id = null
      where id = p_tile_id;
    end if;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.resolve_challenge(uuid, uuid, uuid, uuid, text, boolean, integer, integer, integer, integer, timestamptz) from public;
grant execute on function public.resolve_challenge(uuid, uuid, uuid, uuid, text, boolean, integer, integer, integer, integer, timestamptz) to authenticated;
grant execute on function public.resolve_challenge(uuid, uuid, uuid, uuid, text, boolean, integer, integer, integer, integer, timestamptz) to service_role;
