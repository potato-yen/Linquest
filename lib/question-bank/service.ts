import { SupabaseClient } from '@supabase/supabase-js';
import { Difficulty, Question, QuestionBank } from './types';

export async function listBanks(
  sb: SupabaseClient,
): Promise<QuestionBank[]> {
  const { data, error } = await sb
    .from('question_banks')
    .select('*')
    .eq('source', 'official')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as QuestionBank[];
}

export async function getBank(
  sb: SupabaseClient,
  id: string,
): Promise<QuestionBank | null> {
  const { data, error } = await sb
    .from('question_banks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as QuestionBank | null;
}

export async function listQuestions(
  sb: SupabaseClient,
  bankId: string,
): Promise<Question[]> {
  const { data, error } = await sb
    .from('questions')
    .select('*')
    .eq('bank_id', bankId);

  if (error) {
    throw error;
  }

  return data as Question[];
}

export async function listQuestionsByDifficulty(
  sb: SupabaseClient,
  bankId: string,
  difficulty: Difficulty,
): Promise<Question[]> {
  const { data, error } = await sb
    .from('questions')
    .select('*')
    .eq('bank_id', bankId)
    .filter('meta->>difficulty', 'eq', difficulty);

  if (error) {
    throw error;
  }

  return data as Question[];
}
