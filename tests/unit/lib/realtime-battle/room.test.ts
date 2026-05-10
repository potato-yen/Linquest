import { reduceBattleRoomState } from '../../../../lib/realtime-battle/room';
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

describe('realtime battle room reducer', () => {
  it('stores authoritative row updates', () => {
    const next = reduceBattleRoomState(
      { row: null },
      {
        type: 'row',
        row: baseRow,
      },
    );

    expect(next).toEqual({ row: baseRow });
  });

  it('preserves the latest row while attaching broadcast events for animations', () => {
    const next = reduceBattleRoomState(
      { row: baseRow },
      {
        type: 'broadcast',
        event: 'question_revealed',
        payload: { question_index: 1 },
        at: '2026-05-11T10:00:01.000Z',
      },
    );

    expect(next).toEqual({
      row: baseRow,
      last_event: {
        type: 'question_revealed',
        payload: { question_index: 1 },
        at: '2026-05-11T10:00:01.000Z',
      },
    });
  });
});
