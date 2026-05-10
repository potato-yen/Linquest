create or replace function public.expire_territory_challenge_locks()
returns integer as $$
declare
  v_count integer;
begin
  with expired as (
    update public.hex_tiles
    set
      active_challenge_id = null,
      active_challenge_kind = null,
      active_challenge_user_id = null,
      active_challenge_until = null,
      active_battle_id = null
    where active_challenge_until is not null
      and active_challenge_until < now()
    returning 1
  )
  select count(*) into v_count from expired;

  return v_count;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.expire_territory_challenge_locks() to service_role;
