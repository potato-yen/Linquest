// lib/answering/adapters/roadmap.ts
import { EngineHostHooks } from '../types';

// v1: wrong-answer history is NOT persisted. The AnsweringEngine's in-memory
// retry queue is the only retry mechanism. onAttempt is intentionally a no-op
// (kept on the interface so the engine contract is unchanged; v2 SRS will
// route attempts here).
export function makeRoadmapHostHooks(opts: {
  onFinish: EngineHostHooks['onFinish'];
}): EngineHostHooks {
  return {
    enableRetry: true,
    onAttempt: async () => {},
    onFinish: opts.onFinish,
  };
}
