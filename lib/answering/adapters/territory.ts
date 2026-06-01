import { EngineHostHooks, Attempt } from '../types';

export function makeTerritoryHostHooks(opts: {
  resolveChallenge: (args: { all_correct: boolean }) => Promise<void>;
  onResolved: (allCorrect: boolean) => void;
  onAttempt?: (a: Attempt) => Promise<void> | void;
}): EngineHostHooks {
  return {
    enableRetry: false,
    onAttempt: async (a) => {
      await opts.onAttempt?.(a);
    },
    onFinish: async (sum) => {
      const allCorrect = sum.firstRoundResults.every((a) => a.is_correct);
      await opts.resolveChallenge({
        all_correct: allCorrect,
      });
      opts.onResolved(allCorrect);
    },
    onAbort: async () => {
      await opts.resolveChallenge({
        all_correct: false,
      });
      opts.onResolved(false);
    },
  };
}
