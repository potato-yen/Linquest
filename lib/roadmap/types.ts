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

export interface RoadmapMastery {
  user_id: string;
  bank_id: string;
  question_id: string;
  mastery_level: number;
  next_review_at: string;
  last_interval_days: number;
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
    part_of_speech?: string;
    [key: string]: unknown;
  };
}

export interface SubmitAttemptInput {
  userId: string;
  questionId: string; // Now refers to the stable string ID from the sheet
  isCorrect: boolean;
  responseMs: number;
}

export const ROADMAP_STAGE_QUESTION_COUNT = 15;
export const ROADMAP_UNLOCK_THRESHOLD = 0.8;
