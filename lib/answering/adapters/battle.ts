import { Attempt, EngineHostHooks } from '../types';

interface SubmitBattleAnswerFn {
  (args: { battle_id: string; question_index: number; choice: string; response_ms: number }): Promise<unknown>;
}

export function makeBattleHostHooks(opts: {
  submitBattleAnswer: SubmitBattleAnswerFn;
  onFinish: EngineHostHooks['onFinish'];
  battleId?: string;
  currentIndex?: () => number;
}): EngineHostHooks {
  return {
    enableRetry: false,
    onAttempt: async (a: Attempt) => {
      if (!opts.battleId) return;
      await opts.submitBattleAnswer({
        battle_id: opts.battleId,
        question_index: opts.currentIndex?.() ?? 0,
        choice: a.chosen,
        response_ms: a.response_ms,
      });
    },
    onFinish: opts.onFinish,
  };
}
