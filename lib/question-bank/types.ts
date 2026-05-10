export type BankSource = 'official' | 'custom';
export type Difficulty = 'standard' | 'advanced';

export interface QuestionBank {
  id: string;
  name: string;
  source: BankSource;
  language: string;
  created_at: string;
}

export interface Question {
  id: string;
  bank_id: string;
  prompt: string;
  correct_answer: string;
  distractors: string[];
  meta: { difficulty?: Difficulty; [key: string]: unknown };
  created_at: string;
}
