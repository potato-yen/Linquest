// lib/answering/adapters/roadmap.ts
import { Attempt, EngineHostHooks } from '../types';

interface SubmitAttemptFn {
  (args: { userId: string; questionId: string; isCorrect: boolean; responseMs: number }): Promise<void>;
}

export function makeRoadmapHostHooks(opts: {
  userId: string;
  submitAttempt: SubmitAttemptFn;
  onFinish: EngineHostHooks['onFinish'];
}): EngineHostHooks {
  return {
    enableRetry: true,
    onAttempt: async (a: Attempt) => {
      await opts.submitAttempt({
        userId: opts.userId, questionId: a.question_id,
        isCorrect: a.is_correct, responseMs: a.response_ms,
      });
    },
    onFinish: opts.onFinish,
  };
}
