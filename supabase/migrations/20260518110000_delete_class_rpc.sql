create or replace function public.delete_class(p_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_activity_id uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (select 1 from public.classes where id = p_class_id) then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  if not public.auth_uid_owns_class(p_class_id) then
    raise exception 'NOT_CLASS_OWNER';
  end if;

  for v_activity_id in
    select id
    from public.activities
    where class_id = p_class_id
  loop
    perform public.delete_activity(v_activity_id);
  end loop;

  delete from public.classes where id = p_class_id;
end;
$$;

revoke all on function public.delete_class(uuid) from public;
grant execute on function public.delete_class(uuid) to authenticated, service_role;
