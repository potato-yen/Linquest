create or replace function public.submit_battle_answer(
  p_battle_id uuid,
  p_question_index integer,
  p_choice text,
  p_response_ms integer
) returns text as $$
declare
  v_caller uuid := auth.uid();
  v_battle public.battles%rowtype;
  v_question_id uuid;
  v_correct_answer text;
  v_is_correct boolean;
  v_is_challenger boolean;
  v_my_locked integer[];
  v_other_locked integer[];
begin
  if v_caller is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select *
  into v_battle
  from public.battles
  where id = p_battle_id
  for update;

  if v_battle.id is null then
    raise exception 'BATTLE_NOT_FOUND';
  end if;

  if v_battle.status <> 'in_progress' then
    raise exception 'BATTLE_NOT_IN_PROGRESS';
  end if;

  if v_caller = v_battle.challenger_user_id then
    v_is_challenger := true;
    v_my_locked := v_battle.challenger_locked;
    v_other_locked := v_battle.defender_locked;
  elsif v_caller = v_battle.defender_user_id then
    v_is_challenger := false;
    v_my_locked := v_battle.defender_locked;
    v_other_locked := v_battle.challenger_locked;
  else
    raise exception 'NOT_A_PLAYER';
  end if;

  if p_question_index > v_battle.current_index then
    raise exception 'INDEX_IN_FUTURE';
  end if;

  v_question_id := v_battle.question_ids[p_question_index + 1];
  select correct_answer
  into v_correct_answer
  from public.questions
  where id = v_question_id;

  v_is_correct := p_choice = v_correct_answer;

  if p_question_index < v_battle.current_index then
    insert into public.attempts (
      user_id,
      question_id,
      activity_id,
      context,
      battle_id,
      is_correct,
      response_ms
    ) values (
      v_caller,
      v_question_id,
      v_battle.activity_id,
      'battle',
      p_battle_id,
      v_is_correct,
      p_response_ms
    );

    if v_is_correct then
      return 'correct_late';
    end if;

    return 'incorrect';
  end if;

  if v_battle.reveal_at is null or now() < v_battle.reveal_at then
    raise exception 'NOT_REVEALED_YET';
  end if;

  if v_battle.question_deadline_at is not null and now() > v_battle.question_deadline_at then
    raise exception 'QUESTION_DEADLINE_PASSED';
  end if;

  if p_question_index = any(v_my_locked) then
    raise exception 'ALREADY_LOCKED';
  end if;

  insert into public.attempts (
    user_id,
    question_id,
    activity_id,
    context,
    battle_id,
    is_correct,
    response_ms
  ) values (
    v_caller,
    v_question_id,
    v_battle.activity_id,
    'battle',
    p_battle_id,
    v_is_correct,
    p_response_ms
  );

  if v_is_correct and not v_battle.current_index_decided then
    if v_is_challenger then
      update public.battles
      set
        challenger_score = challenger_score + 1,
        current_index_decided = true,
        current_index = current_index + 1
      where id = p_battle_id;
    else
      update public.battles
      set
        defender_score = defender_score + 1,
        current_index_decided = true,
        current_index = current_index + 1
      where id = p_battle_id;
    end if;

    perform public.advance_battle_question(p_battle_id);
    return 'correct_first';
  end if;

  if v_is_correct then
    return 'correct_late';
  end if;

  if v_is_challenger then
    update public.battles
    set challenger_locked = array_append(challenger_locked, p_question_index)
    where id = p_battle_id;
  else
    update public.battles
    set defender_locked = array_append(defender_locked, p_question_index)
    where id = p_battle_id;
  end if;

  if p_question_index = any(v_other_locked) and not v_battle.current_index_decided then
    update public.battles
    set current_index = current_index + 1
    where id = p_battle_id;

    perform public.advance_battle_question(p_battle_id);
  end if;

  return 'incorrect';
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.submit_battle_answer(uuid, integer, text, integer) to authenticated;

create or replace function public.heartbeat_battle(p_battle_id uuid)
returns void as $$
declare
  v_caller uuid := auth.uid();
  v_battle public.battles%rowtype;
begin
  if v_caller is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select *
  into v_battle
  from public.battles
  where id = p_battle_id;

  if v_battle.id is null then
    raise exception 'BATTLE_NOT_FOUND';
  end if;

  if v_battle.status <> 'in_progress' then
    raise exception 'BATTLE_NOT_IN_PROGRESS';
  end if;

  if v_caller = v_battle.challenger_user_id then
    update public.battles
    set challenger_last_heartbeat_at = now()
    where id = p_battle_id;
  elsif v_caller = v_battle.defender_user_id then
    update public.battles
    set defender_last_heartbeat_at = now()
    where id = p_battle_id;
  else
    raise exception 'NOT_A_PLAYER';
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.heartbeat_battle(uuid) to authenticated;
