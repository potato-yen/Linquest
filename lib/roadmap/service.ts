import { SupabaseClient } from '@supabase/supabase-js';
import { pickLevelForStage } from './level-mapping';
export { ROADMAP_BANK_ID } from './roadmap-config';
import { ROADMAP_BANK_ID, ROADMAP_CONFIG } from './roadmap-config';
import { loadSheetBank, sampleDistractors } from './sheet-source';
import { shuffle } from './shuffle';
import {
  ROADMAP_STAGE_QUESTION_COUNT,
  RoadmapConfig,
  RoadmapMastery,
  RoadmapProgress,
  StageQuestion,
  SubmitAttemptInput,
} from './types';

const DISTRACTOR_COUNT = 3;

/** Spaced repetition intervals (in days) */
const CORRECT_INTERVALS = [1, 3, 7, 14, 30];
const INCORRECT_INTERVALS = [0.5, 2, 6, 12, 25];

export function calculateSpacedRepetition(
  isCorrect: boolean,
  currentMasteryLevel: number,
): { nextMasteryLevel: number; nextReviewAt: Date; intervalDays: number } {
  let nextMasteryLevel: number;
  let intervalDays: number;

  if (isCorrect) {
    nextMasteryLevel = Math.min(5, currentMasteryLevel + 1);
    // If level is 0, we use the first interval (1 day)
    intervalDays = CORRECT_INTERVALS[Math.max(0, nextMasteryLevel - 1)];
  } else {
    nextMasteryLevel = Math.max(0, currentMasteryLevel - 1);
    // If level is 0, we use the first penalty interval (0.5 days)
    intervalDays = INCORRECT_INTERVALS[nextMasteryLevel];
  }

  const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
  return { nextMasteryLevel, nextReviewAt, intervalDays };
}

/** The roadmap "bank" is now a code constant; the DB row only anchors the FK. */
export function getRoadmapBank(): { id: string; config: RoadmapConfig } {
  return { id: ROADMAP_BANK_ID, config: ROADMAP_CONFIG };
}

export async function getProgress(
  sb: SupabaseClient,
  userId: string,
): Promise<RoadmapProgress | null> {
  const { data, error } = await sb
    .from('roadmap_progress')
    .select('user_id, bank_id, current_stage, updated_at')
    .eq('user_id', userId)
    .eq('bank_id', ROADMAP_BANK_ID)
    .maybeSingle();

  if (error) throw error;
  return data ? (data as RoadmapProgress) : null;
}

/**
 * Upsert progress to currentStage. The DB trigger roadmap_progress_no_regress
 * keeps the larger of existing/requested current_stage, so the returned row
 * may be larger than requested.
 */
export async function upsertProgress(
  sb: SupabaseClient,
  userId: string,
  currentStage: number,
): Promise<RoadmapProgress> {
  if (!Number.isInteger(currentStage) || currentStage < 1) {
    throw new Error(
      `upsertProgress: currentStage must be a positive integer, got ${currentStage}`,
    );
  }

  const { data, error } = await sb
    .from('roadmap_progress')
    .upsert(
      { user_id: userId, bank_id: ROADMAP_BANK_ID, current_stage: currentStage },
      { onConflict: 'user_id,bank_id' },
    )
    .select('user_id, bank_id, current_stage, updated_at')
    .single();

  if (error) throw error;
  return data as RoadmapProgress;
}

export async function submitRoadmapAttempt(
  sb: SupabaseClient,
  input: SubmitAttemptInput,
): Promise<void> {
  // 1. Record the attempt
  const { error: attemptErr } = await sb
    .from('attempts')
    .insert({
      user_id: input.userId,
      question_id: null, // Roadmap uses stable string IDs in roadmap_mastery, not UUIDs in public.questions
      activity_id: null,
      context: 'roadmap',
      tile_id: null,
      battle_id: null,
      is_correct: input.isCorrect,
      response_ms: input.responseMs,
      payload: { stable_question_id: input.questionId }
    });

  if (attemptErr) throw attemptErr;

  // 2. Fetch current mastery state
  const { data: currentMastery, error: masteryFetchErr } = await sb
    .from('roadmap_mastery')
    .select('*')
    .eq('user_id', input.userId)
    .eq('bank_id', ROADMAP_BANK_ID)
    .eq('question_id', input.questionId)
    .maybeSingle();

  if (masteryFetchErr) throw masteryFetchErr;

  // 3. Calculate next state
  const currentLevel = currentMastery ? (currentMastery as RoadmapMastery).mastery_level : 0;
  const { nextMasteryLevel, nextReviewAt, intervalDays } = calculateSpacedRepetition(
    input.isCorrect,
    currentLevel,
  );

  // 4. Update mastery
  const { error: masteryUpsertErr } = await sb
    .from('roadmap_mastery')
    .upsert({
      user_id: input.userId,
      bank_id: ROADMAP_BANK_ID,
      question_id: input.questionId,
      mastery_level: nextMasteryLevel,
      next_review_at: nextReviewAt.toISOString(),
      last_interval_days: intervalDays,
    }, { onConflict: 'user_id,bank_id,question_id' });

  if (masteryUpsertErr) throw masteryUpsertErr;
}

export async function selectStageQuestions(
  userId: string,
  stage: number,
  count: number = ROADMAP_STAGE_QUESTION_COUNT,
  rng: () => number = Math.random,
): Promise<StageQuestion[]> {
  const level = pickLevelForStage(stage, ROADMAP_CONFIG);
  if (level === null) {
    throw new Error(
      `selectStageQuestions: stage ${stage} exceeds final range; caller should check pickLevelForStage first`,
    );
  }

  const sb = getSupabaseClient(); // Assuming we have access to a client provider or can pass it
  const bank = await loadSheetBank();
  const pool = bank[level] ?? [];
  if (pool.length === 0) {
    throw new Error(`selectStageQuestions: no questions for level ${level}`);
  }

  // 1. Fetch mastery for all questions in this level
  const { data: masteryData, error: masteryErr } = await sb
    .from('roadmap_mastery')
    .select('question_id, next_review_at')
    .eq('user_id', userId)
    .eq('bank_id', ROADMAP_BANK_ID)
    .in('question_id', pool.map(q => q.id));

  if (masteryErr) throw masteryErr;

  const masteryMap = new Map((masteryData ?? []).map((m: any) => [m.question_id, m.next_review_at]));
  const now = Date.now();

  // Categorize questions
  const due: StageQuestion[] = [];
  const unseen: StageQuestion[] = [];
  const upcoming: { q: StageQuestion, at: number }[] = [];

  for (const q of pool) {
    const nextReview = masteryMap.get(q.id);
    if (!nextReview) {
      unseen.push(q);
    } else {
      const at = new Date(nextReview).getTime();
      if (at <= now) {
        due.push(q);
      } else {
        upcoming.push({ q, at });
      }
    }
  }

  // Shuffle pools
  const shuffledDue = shuffle(due, rng);
  const shuffledUnseen = shuffle(unseen, rng);
  const sortedUpcoming = upcoming.sort((a, b) => a.at - b.at).map(u => u.q);

  // Combine pools: Due -> Unseen -> Upcoming
  const combined = [...shuffledDue, ...shuffledUnseen, ...sortedUpcoming];
  const picked = combined.slice(0, count);

  return picked.map((q) => ({
    ...q,
    distractors: sampleDistractors(pool, q.correct_answer, DISTRACTOR_COUNT, rng),
  }));
}

// Helper to provide supabase client - this might need proper placement
import { getSupabaseClient } from '../supabase';
