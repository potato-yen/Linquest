export interface RoadmapLevelMapping {
  level: number;
  stage_start: number;
  stage_end: number;
}

export interface RoadmapConfig {
  levels: RoadmapLevelMapping[];
}

export interface RoadmapProgress {
  user_id: string;
  bank_id: string;
  current_stage: number;
  updated_at: string;
}

export interface StageQuestion {
  id: string;
  prompt: string;
  correct_answer: string;
  distractors: string[];
  meta: {
    roadmap_level?: number;
    example_sentence?: string;
    [key: string]: unknown;
  };
}

export interface SubmitAttemptInput {
  userId: string; // Must equal auth.uid(); attempts RLS with-check enforces this.
  questionId: string;
  isCorrect: boolean;
  responseMs: number; // Frontend stopwatch value; attempts.response_ms has CHECK >= 0.
  // attempts has no stage column. Add one via migration in v2 if stage-level attempt analytics become necessary.
}

export const ROADMAP_STAGE_QUESTION_COUNT = 15;
export const ROADMAP_UNLOCK_THRESHOLD = 0.8;
