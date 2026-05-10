export type BattleStatus = 'pending_invite' | 'in_progress' | 'finished' | 'aborted';

export type BattleAbortReason =
  | 'invite_declined'
  | 'invite_timeout'
  | 'both_disconnected'
  | 'tile_locked_externally';

export type BattleAnswerResult =
  | 'correct_first'
  | 'correct_late'
  | 'incorrect'
  | 'rejected';

export interface BattleQuestion {
  id: string;
  prompt: string;
  choices: [string, string, string, string];
}

export interface BattleQuestionRecord extends BattleQuestion {
  correct_answer?: string | number;
}

export interface BattleRow {
  id: string;
  activity_id: string;
  tile_id: string;
  challenger_user_id: string;
  defender_user_id: string;
  status: BattleStatus;
  question_ids: string[];
  current_index: number;
  current_index_decided: boolean;
  reveal_at: string | null;
  question_deadline_at: string | null;
  challenger_score: number;
  defender_score: number;
  challenger_locked: number[];
  defender_locked: number[];
  challenger_last_heartbeat_at: string | null;
  defender_last_heartbeat_at: string | null;
  winner_user_id: string | null;
  abort_reason: BattleAbortReason | null;
  ended_at: string | null;
  created_at: string;
}

export interface BattleRoomState {
  row: BattleRow | null;
  last_event?: {
    type: string;
    payload: unknown;
    at: string;
  };
}

export interface PresenceEntry {
  user_id: string;
  group_id: string;
  in_battle: boolean;
  last_active_at: string;
}

export const REALTIME_BATTLE_DEFAULTS = {
  per_question_timeout_seconds: 15,
  heartbeat_grace_seconds: 60,
  presence_heartbeat_interval_seconds: 10,
  reveal_offset_ms: 200,
  battle_question_count: 5,
  battle_invite_timeout_minutes: 5,
} as const;

export function toBattleQuestion(question: BattleQuestionRecord): BattleQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    choices: [
      question.choices[0],
      question.choices[1],
      question.choices[2],
      question.choices[3],
    ],
  };
}

export function isTerminalBattleStatus(status: BattleStatus): boolean {
  return status === 'finished' || status === 'aborted';
}
