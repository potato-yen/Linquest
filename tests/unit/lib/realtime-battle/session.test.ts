import {
  beginBattleSubmission,
  canSubmitBattleChoice,
  createBattleClientState,
  getBattleChoiceState,
  rejectBattleSubmission,
  resolveBattleSubmission,
  syncBattleClientState,
} from '../../../../lib/realtime-battle/session';
import { BattleRow } from '../../../../lib/realtime-battle/types';

const baseRow: BattleRow = {
  id: 'battle-1',
  activity_id: 'activity-1',
  tile_id: 'tile-1',
  challenger_user_id: 'user-1',
  defender_user_id: 'user-2',
  status: 'in_progress',
  question_ids: ['q1', 'q2', 'q3', 'q4', 'q5'],
  current_index: 0,
  current_index_decided: false,
  reveal_at: null,
  question_deadline_at: null,
  challenger_score: 0,
  defender_score: 0,
  challenger_locked: [],
  defender_locked: [],
  challenger_last_heartbeat_at: null,
  defender_last_heartbeat_at: null,
  winner_user_id: null,
  abort_reason: null,
  ended_at: null,
  created_at: '2026-05-11T10:00:00.000Z',
};

describe('battle client session state', () => {
  it('starts a submission only for the server current index', () => {
    const state = beginBattleSubmission(createBattleClientState(), baseRow, 'banana');

    expect(state).toEqual({
      phase: 'submitting',
      questionIndex: 0,
      chosen: 'banana',
      result: null,
      error: null,
    });
  });

  it('does not allow another submission while waiting for server ack', () => {
    const state = beginBattleSubmission(createBattleClientState(), baseRow, 'banana');
    expect(canSubmitBattleChoice(baseRow, state)).toBe(false);
  });

  it('reveals only after the submit RPC acknowledges the answer', () => {
    const submitting = beginBattleSubmission(createBattleClientState(), baseRow, 'banana');
    const revealed = resolveBattleSubmission(submitting, 'incorrect');

    expect(revealed.phase).toBe('revealed');
    expect(getBattleChoiceState('apple', 'apple', revealed)).toBe('correct');
    expect(getBattleChoiceState('banana', 'apple', revealed)).toBe('incorrect');
    expect(getBattleChoiceState('cherry', 'apple', revealed)).toBe('idle');
  });

  it('keeps the UI idle when submit is rejected', () => {
    const state = rejectBattleSubmission(baseRow, 'QUESTION_DEADLINE_PASSED');

    expect(state).toEqual({
      phase: 'idle',
      questionIndex: 0,
      chosen: null,
      result: null,
      error: 'QUESTION_DEADLINE_PASSED',
    });
  });

  it('resets local reveal state when the server advances to the next question', () => {
    const revealed = resolveBattleSubmission(
      beginBattleSubmission(createBattleClientState(), baseRow, 'banana'),
      'correct_first',
    );

    const nextRow = {
      ...baseRow,
      current_index: 1,
    };

    expect(syncBattleClientState(revealed, nextRow)).toEqual(createBattleClientState());
  });

  it('blocks local submission after the server has already decided the question', () => {
    const decidedRow = {
      ...baseRow,
      current_index_decided: true,
    };

    expect(canSubmitBattleChoice(decidedRow, createBattleClientState())).toBe(false);
    expect(beginBattleSubmission(createBattleClientState(), decidedRow, 'banana'))
      .toEqual(createBattleClientState());
  });
});
