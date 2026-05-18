// tests/unit/lib/answering/adapters/roadmap.test.ts
import { makeRoadmapHostHooks } from '../../../../../lib/answering/adapters/roadmap';

describe('makeRoadmapHostHooks', () => {
  it('returns enableRetry=true and forwards attempts to the supplied callback', async () => {
    const onFinish = jest.fn();
    const onAttempt = jest.fn();
    const hooks = makeRoadmapHostHooks({ onFinish, onAttempt });
    expect(hooks.enableRetry).toBe(true);
    await expect(
      hooks.onAttempt({
        question_id: 'q1',
        is_correct: true,
        response_ms: 250,
        chosen: 'a',
      }),
    ).resolves.toBeUndefined();
    expect(onAttempt).toHaveBeenCalledWith({
      question_id: 'q1',
      is_correct: true,
      response_ms: 250,
      chosen: 'a',
    });
  });

  it('passes onFinish through unchanged', () => {
    const onFinish = jest.fn();
    const hooks = makeRoadmapHostHooks({ onFinish });
    hooks.onFinish({ firstRoundResults: [], totalAttempts: [] });
    expect(onFinish).toHaveBeenCalled();
  });
});
