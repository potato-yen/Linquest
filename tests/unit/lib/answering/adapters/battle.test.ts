import { makeBattleHostHooks } from '../../../../../lib/answering/adapters/battle';

describe('makeBattleHostHooks', () => {
  it('enableRetry=false', () => {
    const h = makeBattleHostHooks({ submitBattleAnswer: jest.fn(), onFinish: jest.fn() });
    expect(h.enableRetry).toBe(false);
  });

  it('onAttempt routes to submitBattleAnswer with index + chosen + ms', async () => {
    const submit = jest.fn().mockResolvedValue('correct_first');
    const onFinish = jest.fn();
    const h = makeBattleHostHooks({ submitBattleAnswer: submit, onFinish, currentIndex: () => 2, battleId: 'b1' });
    await h.onAttempt({ question_id: 'q', is_correct: true, response_ms: 800, chosen: 'banana' });
    expect(submit).toHaveBeenCalledWith({ battle_id: 'b1', question_index: 2, choice: 'banana', response_ms: 800 });
  });

  it('onFinish forwards to caller', () => {
    const onFinish = jest.fn();
    const h = makeBattleHostHooks({ submitBattleAnswer: jest.fn(), onFinish });
    h.onFinish({ firstRoundResults: [], totalAttempts: [] });
    expect(onFinish).toHaveBeenCalled();
  });
});
