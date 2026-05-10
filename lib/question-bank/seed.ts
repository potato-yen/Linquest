import { SupabaseClient } from '@supabase/supabase-js';
import { Difficulty, Question } from './types';

export type ParsedRow = Pick<
  Question,
  'prompt' | 'correct_answer' | 'distractors' | 'meta'
>;

export interface SeedBankInput {
  bank_name: string;
  csv: string;
  language?: string;
}

function parseDifficulty(value: string | undefined): Difficulty {
  return value === 'advanced' ? 'advanced' : 'standard';
}

export function parseBankCsv(csv: string): ParsedRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].split(',').map((cell) => cell.trim());
  const requiredColumns = [
    'prompt',
    'correct_answer',
    'distractor_1',
    'distractor_2',
    'distractor_3',
  ];

  for (const column of requiredColumns) {
    if (!header.includes(column)) {
      throw new Error(`missing column: ${column}`);
    }
  }

  const columnIndex = (name: string) => header.indexOf(name);
  const rows: ParsedRow[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const cells = lines[index].split(',').map((cell) => cell.trim());
    const distractors = [
      cells[columnIndex('distractor_1')],
      cells[columnIndex('distractor_2')],
      cells[columnIndex('distractor_3')],
    ];

    if (distractors.some((distractor) => !distractor)) {
      throw new Error(`row ${index + 1}: must have 3 distractors`);
    }

    const difficultyIndex = columnIndex('difficulty');
    const difficulty = parseDifficulty(
      difficultyIndex >= 0 ? cells[difficultyIndex] : undefined,
    );

    rows.push({
      prompt: cells[columnIndex('prompt')],
      correct_answer: cells[columnIndex('correct_answer')],
      distractors,
      meta: { difficulty },
    });
  }

  return rows;
}

export async function seedBank(
  sb: SupabaseClient,
  input: SeedBankInput,
): Promise<{ bank_id: string; inserted: number }> {
  const { data: bank, error: bankError } = await sb
    .from('question_banks')
    .insert({
      name: input.bank_name,
      source: 'official',
      language: input.language ?? 'en',
    })
    .select()
    .single();

  if (bankError) {
    throw bankError;
  }

  const rows = parseBankCsv(input.csv);
  const payload = rows.map((row) => ({ ...row, bank_id: bank.id }));

  if (payload.length > 0) {
    const { error: insertError } = await sb.from('questions').insert(payload);
    if (insertError) {
      throw insertError;
    }
  }

  return { bank_id: bank.id, inserted: payload.length };
}
