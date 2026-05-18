import { BattleAnswerResult, BattleRow } from './types';

export type BattleClientPhase = 'idle' | 'submitting' | 'revealed';

export interface BattleClientState {
  phase: BattleClientPhase;
  questionIndex: number | null;
  chosen: string | null;
  result: BattleAnswerResult | null;
  error: string | null;
}

export function createBattleClientState(): BattleClientState {
  return {
    phase: 'idle',
    questionIndex: null,
    chosen: null,
    result: null,
    error: null,
  };
}

export function syncBattleClientState(
  state: BattleClientState,
  row: Pick<BattleRow, 'status' | 'current_index'>,
): BattleClientState {
  if (row.status !== 'in_progress') {
    return createBattleClientState();
  }

  if (state.questionIndex !== row.current_index) {
    return createBattleClientState();
  }

  return state;
}

export function beginBattleSubmission(
  state: BattleClientState,
  row: Pick<BattleRow, 'status' | 'current_index' | 'current_index_decided'>,
  choice: string,
): BattleClientState {
  if (row.status !== 'in_progress' || row.current_index_decided) {
    return state;
  }

  return {
    phase: 'submitting',
    questionIndex: row.current_index,
    chosen: choice,
    result: null,
    error: null,
  };
}

export function resolveBattleSubmission(
  state: BattleClientState,
  result: BattleAnswerResult,
): BattleClientState {
  if (state.phase !== 'submitting') {
    return state;
  }

  return {
    ...state,
    phase: 'revealed',
    result,
    error: null,
  };
}

export function rejectBattleSubmission(
  row: Pick<BattleRow, 'status' | 'current_index'>,
  message: string,
): BattleClientState {
  if (row.status !== 'in_progress') {
    return createBattleClientState();
  }

  return {
    phase: 'idle',
    questionIndex: row.current_index,
    chosen: null,
    result: null,
    error: message,
  };
}

export function canSubmitBattleChoice(
  row: Pick<BattleRow, 'status' | 'current_index_decided'>,
  state: BattleClientState,
): boolean {
  return row.status === 'in_progress' &&
    !row.current_index_decided &&
    state.phase === 'idle';
}

export function getBattleChoiceState(
  choice: string,
  correctAnswer: string,
  state: BattleClientState,
): 'idle' | 'correct' | 'incorrect' {
  if (state.phase !== 'revealed') {
    return 'idle';
  }

  if (choice === correctAnswer) {
    return 'correct';
  }

  if (choice === state.chosen) {
    return 'incorrect';
  }

  return 'idle';
}
