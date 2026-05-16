// tests/unit/lib/answering/adapters/roadmap.test.ts
import { makeRoadmapHostHooks } from '../../../../../lib/answering/adapters/roadmap';

describe('makeRoadmapHostHooks', () => {
  it('returns enableRetry=true and onAttempt is a no-op that resolves', async () => {
    const onFinish = jest.fn();
    const hooks = makeRoadmapHostHooks({ onFinish });
    expect(hooks.enableRetry).toBe(true);
    await expect(
      hooks.onAttempt({
        question_id: 'q1',
        is_correct: true,
        response_ms: 250,
        chosen: 'a',
      }),
    ).resolves.toBeUndefined();
  });

  it('passes onFinish through unchanged', () => {
    const onFinish = jest.fn();
    const hooks = makeRoadmapHostHooks({ onFinish });
    hooks.onFinish({ firstRoundResults: [], totalAttempts: [] });
    expect(onFinish).toHaveBeenCalled();
  });
});
