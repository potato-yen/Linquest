import { EngineHostHooks } from '../types';

export function makeTerritoryHostHooks(opts: {
  resolveChallenge: (args: { all_correct: boolean }) => Promise<void>;
  onResolved: (allCorrect: boolean) => void;
}): EngineHostHooks {
  return {
    enableRetry: false,
    onAttempt: async () => {},
    onFinish: async (sum) => {
      const allCorrect = sum.firstRoundResults.every((a) => a.is_correct);
      await opts.resolveChallenge({ all_correct: allCorrect });
      opts.onResolved(allCorrect);
    },
  };
}
