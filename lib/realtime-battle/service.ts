import { SupabaseClient } from '@supabase/supabase-js';
import { performSbCall } from '../supabase';
import { parseBattleRpcCode } from './errors';
import { BattleAnswerResult } from './types';

export interface SendBattleInviteInput {
  activity_id: string;
  tile_id: string;
  defender_user_id: string;
}

export interface SubmitBattleAnswerInput {
  battle_id: string;
  question_index: number;
  choice: string;
  response_ms: number;
}

export async function sendBattleInvite(
  sb: SupabaseClient,
  input: SendBattleInviteInput,
): Promise<string> {
  return performSbCall(sb, 'BATTLE', async () =>
    sb.rpc('send_battle_invite', {
      p_activity_id: input.activity_id,
      p_tile_id: input.tile_id,
      p_defender_user_id: input.defender_user_id,
    }),
    parseBattleRpcCode
  );
}

export async function acceptBattleInvite(sb: SupabaseClient, battleId: string): Promise<void> {
  await performSbCall(sb, 'BATTLE', async () =>
    sb.rpc('accept_battle_invite', {
      p_battle_id: battleId,
    }),
    parseBattleRpcCode
  );
}

export async function declineBattleInvite(sb: SupabaseClient, battleId: string): Promise<void> {
  await performSbCall(sb, 'BATTLE', async () =>
    sb.rpc('decline_battle_invite', {
      p_battle_id: battleId,
    }),
    parseBattleRpcCode
  );
}

export async function submitBattleAnswer(
  sb: SupabaseClient,
  input: SubmitBattleAnswerInput,
): Promise<BattleAnswerResult> {
  return performSbCall(sb, 'BATTLE', async () =>
    sb.rpc('submit_battle_answer', {
      p_battle_id: input.battle_id,
      p_question_index: input.question_index,
      p_choice: input.choice,
      p_response_ms: input.response_ms,
    }),
    parseBattleRpcCode
  );
}

export async function heartbeatBattle(sb: SupabaseClient, battleId: string): Promise<void> {
  await performSbCall(sb, 'BATTLE', async () =>
    sb.rpc('heartbeat_battle', {
      p_battle_id: battleId,
    }),
    parseBattleRpcCode
  );
}
