import { SupabaseClient } from '@supabase/supabase-js';
import { pickLevelForStage, validateRoadmapConfig } from './level-mapping';
import { shuffle } from './shuffle';
import {
  ROADMAP_STAGE_QUESTION_COUNT,
  RoadmapConfig,
  RoadmapProgress,
  StageQuestion,
  SubmitAttemptInput,
} from './types';

interface QuestionBankRow {
  id: string;
  name: string;
  source: string;
  language: string;
  created_at: string;
  roadmap_config: RoadmapConfig | null;
}

export async function getProgress(
  sb: SupabaseClient,
  userId: string,
  bankId: string,
): Promise<RoadmapProgress> {
  const { data, error } = await sb
    .from('roadmap_progress')
    .select('user_id, bank_id, current_stage, updated_at')
    .eq('user_id', userId)
    .eq('bank_id', bankId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as RoadmapProgress;
  }

  return {
    user_id: userId,
    bank_id: bankId,
    current_stage: 1,
    updated_at: new Date(0).toISOString(),
  };
}

export async function upsertProgress(
  sb: SupabaseClient,
  userId: string,
  bankId: string,
  currentStage: number,
): Promise<RoadmapProgress> {
  if (!Number.isInteger(currentStage) || currentStage < 1) {
    throw new Error(`upsertProgress: currentStage must be a positive integer, got ${currentStage}`);
  }

  const { data, error } = await sb
    .from('roadmap_progress')
    .upsert(
      { user_id: userId, bank_id: bankId, current_stage: currentStage },
      { onConflict: 'user_id,bank_id' },
    )
    .select('user_id, bank_id, current_stage, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data as RoadmapProgress;
}

export async function getBankWithConfig(
  sb: SupabaseClient,
  bankId: string,
): Promise<{ bank: QuestionBankRow; config: RoadmapConfig | null }> {
  const { data, error } = await sb
    .from('question_banks')
    .select('id, name, source, language, created_at, roadmap_config')
    .eq('id', bankId)
    .single();

  if (error) {
    throw error;
  }

  const row = data as QuestionBankRow;
  if (row.roadmap_config) {
    validateRoadmapConfig(row.roadmap_config);
  }

  return { bank: row, config: row.roadmap_config };
}

export async function getDefaultRoadmapBank(
  sb: SupabaseClient,
): Promise<QuestionBankRow> {
  const { data, error } = await sb
    .from('question_banks')
    .select('id, name, source, language, created_at, roadmap_config')
    .eq('source', 'official')
    .not('roadmap_config', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No roadmap-enabled official question bank found');
  }

  return data as QuestionBankRow;
}

export async function selectStageQuestions(
  sb: SupabaseClient,
  bankId: string,
  stage: number,
  count: number = ROADMAP_STAGE_QUESTION_COUNT,
  rng: () => number = Math.random,
): Promise<StageQuestion[]> {
  const { config } = await getBankWithConfig(sb, bankId);
  if (!config) {
    throw new Error(`Bank ${bankId} has no roadmap_config`);
  }

  const level = pickLevelForStage(stage, config);
  if (level === null) {
    throw new Error(
      `selectStageQuestions: stage ${stage} exceeds final range; caller should check pickLevelForStage first`,
    );
  }

  const { data, error } = await sb
    .from('questions')
    .select('id, prompt, correct_answer, distractors, meta')
    .eq('bank_id', bankId)
    .filter('meta->>roadmap_level', 'eq', String(level));

  if (error) {
    throw error;
  }

  const pool = (data ?? []) as StageQuestion[];
  return shuffle(pool, rng).slice(0, count);
}

export async function submitAttempt(
  sb: SupabaseClient,
  args: SubmitAttemptInput,
): Promise<void> {
  if (!Number.isInteger(args.responseMs) || args.responseMs < 0) {
    throw new Error(`submitAttempt: responseMs must be a non-negative integer, got ${args.responseMs}`);
  }

  const { error } = await sb.from('attempts').insert({
    user_id: args.userId,
    question_id: args.questionId,
    activity_id: null,
    context: 'roadmap',
    tile_id: null,
    battle_id: null,
    is_correct: args.isCorrect,
    response_ms: args.responseMs,
  });

  if (error) {
    throw error;
  }
}
