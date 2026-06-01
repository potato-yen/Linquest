// lib/answering/types.ts
export interface Question {
  id: string;
  prompt: string;                  // 中文 meaning
  correct_answer: string;          // 英文 word
  distractors: string[];           // 英文 distractors (length 3)
  meta?: {
    example_sentence?: string;
    example_translation?: string;
    ipa?: string;
    [k: string]: unknown;
  };
}

export interface Attempt {
  question_id: string;
  is_correct: boolean;
  response_ms: number;
  chosen: string;
}

export type EnginePhase = 'idle' | 'question' | 'reveal' | 'finished';

export interface AnsweringState {
  phase: EnginePhase;
  currentIndex: number;            // 0-based index across the *total* sequence (firstRound + retries)
  firstRoundCount: number;         // length of the first-round queue
  firstRoundResults: Attempt[];    // appended only during first round
  totalAnswered: Attempt[];        // every attempt, including retries
  current: Question | null;
  lastAttempt: Attempt | null;     // populated during 'reveal'
  retryQueueLength: number;        // for UI hints
}

export interface EngineHostHooks {
  enableRetry: boolean;            // roadmap=true; territory/battle=false
  onAttempt: (a: Attempt) => Promise<void> | void;
  onFinish: (summary: { firstRoundResults: Attempt[]; totalAttempts: Attempt[] }) => void;
  onAbort?: () => Promise<void> | void;
}
