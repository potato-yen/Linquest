create or replace function public.compute_balanced_groups(
  p_member_ids uuid[],
  p_group_count integer
) returns jsonb as $$
declare
  v_shuffled uuid[];
  v_total_members integer;
  v_base_size integer;
  v_remainder integer;
  v_start_index integer := 1;
  v_group_index integer;
  v_group_size integer;
  v_result jsonb := '[]'::jsonb;
begin
  v_total_members := coalesce(array_length(p_member_ids, 1), 0);

  if p_group_count < 1 then
    raise exception 'INVALID_GROUP_COUNT';
  end if;

  if v_total_members < p_group_count then
    raise exception 'NOT_ENOUGH_MEMBERS';
  end if;

  select array_agg(member_id order by shuffle_key)
  into v_shuffled
  from (
    select unnest(p_member_ids) as member_id, random() as shuffle_key
  ) shuffled;

  v_base_size := v_total_members / p_group_count;
  v_remainder := mod(v_total_members, p_group_count);

  for v_group_index in 1..p_group_count loop
    v_group_size := v_base_size + case when v_group_index <= v_remainder then 1 else 0 end;

    v_result := v_result || jsonb_build_array(
      jsonb_build_object(
        'index',
        v_group_index,
        'members',
        to_jsonb(v_shuffled[v_start_index:(v_start_index + v_group_size - 1)])
      )
    );

    v_start_index := v_start_index + v_group_size;
  end loop;

  return v_result;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.compute_balanced_groups(uuid[], integer) from public;
grant execute on function public.compute_balanced_groups(uuid[], integer) to authenticated, service_role;
