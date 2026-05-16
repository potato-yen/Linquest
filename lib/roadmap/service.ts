import { SupabaseClient } from '@supabase/supabase-js';
import { pickLevelForStage } from './level-mapping';
import { ROADMAP_BANK_ID, ROADMAP_CONFIG } from './roadmap-config';
import { loadSheetBank, sampleDistractors } from './sheet-source';
import { shuffle } from './shuffle';
import {
  ROADMAP_STAGE_QUESTION_COUNT,
  RoadmapConfig,
  RoadmapProgress,
  StageQuestion,
} from './types';

const DISTRACTOR_COUNT = 3;

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

export async function selectStageQuestions(
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

  const bank = await loadSheetBank();
  const pool = bank[level] ?? [];
  if (pool.length === 0) {
    throw new Error(`selectStageQuestions: no questions for level ${level}`);
  }

  const picked = shuffle(pool, rng).slice(0, count);
  return picked.map((q) => ({
    ...q,
    distractors: sampleDistractors(pool, q.correct_answer, DISTRACTOR_COUNT, rng),
  }));
}
