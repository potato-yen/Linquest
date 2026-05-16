// tests/unit/lib/answering/adapters/roadmap.test.ts
import { makeRoadmapHostHooks } from '../../../../../lib/answering/adapters/roadmap';

describe('makeRoadmapHostHooks', () => {
  it('returns enableRetry=true and routes onAttempt to submitAttempt', async () => {
    const submitAttempt = jest.fn().mockResolvedValue(undefined);
    const onFinish = jest.fn();
    const hooks = makeRoadmapHostHooks({ userId: 'u1', submitAttempt, onFinish });
    expect(hooks.enableRetry).toBe(true);

    await hooks.onAttempt({ question_id: 'q1', is_correct: true, response_ms: 250, chosen: 'a' });
    expect(submitAttempt).toHaveBeenCalledWith({
      userId: 'u1', questionId: 'q1', isCorrect: true, responseMs: 250,
    });
  });

  it('passes onFinish through unchanged', () => {
    const onFinish = jest.fn();
    const hooks = makeRoadmapHostHooks({ userId: 'u1', submitAttempt: jest.fn(), onFinish });
    hooks.onFinish({ firstRoundResults: [], totalAttempts: [] });
    expect(onFinish).toHaveBeenCalled();
  });
});
