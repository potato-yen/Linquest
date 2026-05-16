import { makeTerritoryHostHooks } from '../../../../../lib/answering/adapters/territory';

describe('makeTerritoryHostHooks', () => {
  it('enableRetry=false (territory does not requeue mistakes)', () => {
    const hooks = makeTerritoryHostHooks({ resolveChallenge: jest.fn().mockResolvedValue(undefined), onResolved: jest.fn() });
    expect(hooks.enableRetry).toBe(false);
  });

  it('onAttempt is a no-op (server already records via attemptCapture/resolveChallenge RPC)', async () => {
    const hooks = makeTerritoryHostHooks({ resolveChallenge: jest.fn(), onResolved: jest.fn() });
    await hooks.onAttempt({ question_id: 'q', is_correct: true, response_ms: 100, chosen: 'x' });
    // no throw — verifies no-op
  });

  it('onFinish: if all correct → calls resolveChallenge with all_correct=true, then onResolved', async () => {
    const resolveChallenge = jest.fn().mockResolvedValue(undefined);
    const onResolved = jest.fn();
    const hooks = makeTerritoryHostHooks({ resolveChallenge, onResolved });
    await hooks.onFinish({
      firstRoundResults: [
        { question_id: 'q1', is_correct: true, response_ms: 100, chosen: 'a' },
        { question_id: 'q2', is_correct: true, response_ms: 100, chosen: 'b' },
      ],
      totalAttempts: [],
    });
    expect(resolveChallenge).toHaveBeenCalledWith({ all_correct: true });
    expect(onResolved).toHaveBeenCalledWith(true);
  });

  it('onFinish: any incorrect → all_correct=false', async () => {
    const resolveChallenge = jest.fn().mockResolvedValue(undefined);
    const onResolved = jest.fn();
    const hooks = makeTerritoryHostHooks({ resolveChallenge, onResolved });
    await hooks.onFinish({
      firstRoundResults: [{ question_id: 'q1', is_correct: false, response_ms: 100, chosen: 'a' }],
      totalAttempts: [],
    });
    expect(resolveChallenge).toHaveBeenCalledWith({ all_correct: false });
    expect(onResolved).toHaveBeenCalledWith(false);
  });
});
