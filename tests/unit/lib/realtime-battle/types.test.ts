import {
  REALTIME_BATTLE_DEFAULTS,
  isTerminalBattleStatus,
  toBattleQuestion,
} from '../../../../lib/realtime-battle/types';

describe('realtime battle types', () => {
  it('exposes the spec defaults for realtime battle timing', () => {
    expect(REALTIME_BATTLE_DEFAULTS).toEqual({
      per_question_timeout_seconds: 15,
      heartbeat_grace_seconds: 60,
      presence_heartbeat_interval_seconds: 10,
      reveal_offset_ms: 200,
      battle_question_count: 5,
      battle_invite_timeout_minutes: 5,
    });
  });

  it('strips the authoritative answer from the client-facing battle question', () => {
    const question = toBattleQuestion({
      id: 'q1',
      prompt: 'capital of Taiwan',
      choices: ['Taipei', 'Tainan', 'Taichung', 'Kaohsiung'],
      correct_answer: 0,
    });

    expect(question).toEqual({
      id: 'q1',
      prompt: 'capital of Taiwan',
      choices: ['Taipei', 'Tainan', 'Taichung', 'Kaohsiung'],
    });
    expect(question).not.toHaveProperty('correct_answer');
  });

  it('marks finished and aborted as terminal battle states', () => {
    expect(isTerminalBattleStatus('pending_invite')).toBe(false);
    expect(isTerminalBattleStatus('in_progress')).toBe(false);
    expect(isTerminalBattleStatus('finished')).toBe(true);
    expect(isTerminalBattleStatus('aborted')).toBe(true);
  });
});
