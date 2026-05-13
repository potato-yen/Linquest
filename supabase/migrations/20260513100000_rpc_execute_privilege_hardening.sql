-- SECURITY DEFINER functions inherit EXECUTE from PUBLIC unless revoked
-- explicitly. Keep only the roles that are intended to call each RPC.

-- Territory maintenance / settlement RPCs: service_role only.
revoke all on function public.settle_activity(uuid) from public;
revoke all on function public.settle_activity(uuid) from authenticated;
grant execute on function public.settle_activity(uuid) to service_role;

revoke all on function public.expire_territory_challenge_locks() from public;
revoke all on function public.expire_territory_challenge_locks() from authenticated;
grant execute on function public.expire_territory_challenge_locks() to service_role;

revoke all on function public.release_battle_lock(uuid, boolean) from public;
revoke all on function public.release_battle_lock(uuid, boolean) from authenticated;
grant execute on function public.release_battle_lock(uuid, boolean) to service_role;

revoke all on function public.apply_battle_result(uuid, uuid) from public;
revoke all on function public.apply_battle_result(uuid, uuid) from authenticated;
grant execute on function public.apply_battle_result(uuid, uuid) to service_role;

-- Battle scheduler/watchdog internals: service_role only.
revoke all on function public.advance_battle_question(uuid) from public;
revoke all on function public.advance_battle_question(uuid) from authenticated;
grant execute on function public.advance_battle_question(uuid) to service_role;

revoke all on function public.expire_battle_invites() from public;
revoke all on function public.expire_battle_invites() from authenticated;
grant execute on function public.expire_battle_invites() to service_role;

revoke all on function public.expire_battle_questions() from public;
revoke all on function public.expire_battle_questions() from authenticated;
grant execute on function public.expire_battle_questions() to service_role;

revoke all on function public.expire_battle_disconnects() from public;
revoke all on function public.expire_battle_disconnects() from authenticated;
grant execute on function public.expire_battle_disconnects() to service_role;

revoke all on function public.sweep_orphan_battle_locks() from public;
revoke all on function public.sweep_orphan_battle_locks() from authenticated;
grant execute on function public.sweep_orphan_battle_locks() to service_role;

-- Student-facing territory/battle RPCs: authenticated only.
revoke all on function public.attempt_capture(uuid, uuid) from public;
grant execute on function public.attempt_capture(uuid, uuid) to authenticated;

revoke all on function public.resolve_challenge(uuid, uuid, uuid, boolean) from public;
grant execute on function public.resolve_challenge(uuid, uuid, uuid, boolean) to authenticated;

revoke all on function public.send_battle_invite(uuid, uuid, uuid) from public;
grant execute on function public.send_battle_invite(uuid, uuid, uuid) to authenticated;

revoke all on function public.accept_battle_invite(uuid) from public;
grant execute on function public.accept_battle_invite(uuid) to authenticated;

revoke all on function public.decline_battle_invite(uuid) from public;
grant execute on function public.decline_battle_invite(uuid) to authenticated;

revoke all on function public.submit_battle_answer(uuid, integer, text, integer) from public;
grant execute on function public.submit_battle_answer(uuid, integer, text, integer) to authenticated;

revoke all on function public.heartbeat_battle(uuid) from public;
grant execute on function public.heartbeat_battle(uuid) to authenticated;
