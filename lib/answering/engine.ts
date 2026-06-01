// lib/answering/engine.ts
import { AnsweringState, Attempt, EngineHostHooks, EnginePhase, Question } from './types';
import { Stopwatch } from '../ui/hooks/useStopwatch';

// Factory (not a shared constant): each call returns fresh arrays so engine
// instances never alias the same firstRoundResults/totalAnswered buffers.
function initialState(): AnsweringState {
  return {
    phase: 'idle' as EnginePhase,
    currentIndex: 0,
    firstRoundCount: 0,
    firstRoundResults: [],
    totalAnswered: [],
    current: null,
    lastAttempt: null,
    retryQueueLength: 0,
  };
}

type Listener = (s: AnsweringState) => void;

export class AnsweringEngine {
  state: AnsweringState = initialState();
  private firstRoundQueue: Question[] = [];
  private retryQueue: Question[] = [];
  private hooks: EngineHostHooks | null = null;
  private stopwatch: Stopwatch;
  private listeners: Set<Listener> = new Set();

  constructor(now: () => number = Date.now) {
    this.stopwatch = new Stopwatch(now);
  }

  start(opts: { questions: Question[] } & EngineHostHooks): void {
    this.hooks = {
      enableRetry: opts.enableRetry,
      onAttempt: opts.onAttempt,
      onFinish: opts.onFinish,
      onAbort: opts.onAbort,
    };
    this.firstRoundQueue = [...opts.questions];
    this.retryQueue = [];
    this.state = {
      ...initialState(),
      phase: 'question',
      current: this.firstRoundQueue[0] ?? null,
      firstRoundCount: opts.questions.length,
    };
    this.stopwatch.start();
    this.notify();
  }

  async answer(choice: string): Promise<void> {
    if (this.state.phase !== 'question' || !this.state.current || !this.hooks) return;
    const q = this.state.current;
    const attempt: Attempt = {
      question_id: q.id,
      is_correct: choice === q.correct_answer,
      response_ms: this.stopwatch.elapsedMs(),
      chosen: choice,
    };

    const isFirstRound = this.state.firstRoundResults.length < this.state.firstRoundCount &&
      this.firstRoundQueue.length > 0 && this.firstRoundQueue[0]?.id === q.id;
    if (isFirstRound) this.state.firstRoundResults.push(attempt);
    this.state.totalAnswered.push(attempt);
    this.state.lastAttempt = attempt;
    this.state.phase = 'reveal';

    if (!attempt.is_correct && this.hooks.enableRetry) this.retryQueue.push(q);
    if (this.firstRoundQueue.length > 0 && this.firstRoundQueue[0]?.id === q.id) this.firstRoundQueue.shift();
    this.state.retryQueueLength = this.retryQueue.length;
    this.notify();

    try { await this.hooks.onAttempt(attempt); } catch { /* swallow; UI shows ok */ }
  }

  next(): void {
    if (this.state.phase !== 'reveal' || !this.hooks) return;
    const nextQ = this.firstRoundQueue[0] ?? this.retryQueue.shift() ?? null;
    if (!nextQ) {
      this.state.phase = 'finished';
      this.state.current = null;
      this.state.retryQueueLength = 0;
      this.notify();
      this.hooks.onFinish({
        firstRoundResults: this.state.firstRoundResults,
        totalAttempts: this.state.totalAnswered,
      });
      return;
    }
    this.state.phase = 'question';
    this.state.current = nextQ;
    this.state.currentIndex += 1;
    this.state.retryQueueLength = this.retryQueue.length;
    this.stopwatch.reset();
    this.notify();
  }

  async abort(): Promise<void> {
    const onAbort = this.hooks?.onAbort;
    this.state = initialState();
    this.firstRoundQueue = [];
    this.retryQueue = [];
    this.hooks = null;
    this.notify();
    try {
      await onAbort?.();
    } catch {
      // Swallow abort cleanup errors; the UI should still close immediately.
    }
  }

  subscribe(l: Listener): () => void { this.listeners.add(l); return () => this.listeners.delete(l); }
  private notify(): void { this.listeners.forEach((l) => l(this.state)); }
}
