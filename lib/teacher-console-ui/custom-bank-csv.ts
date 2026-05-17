// Custom-bank CSV parser (teacher console).
//
// New question model: a row is 中文(prompt) + 英文(correct_answer) +
// 詞性(part_of_speech, optional). No distractor / difficulty columns —
// distractors are sampled from sibling answers at answer time.
//
// Separate from lib/question-bank/seed.parseBankCsv, which still parses the
// legacy distractor format used by the official seed path.

export interface CustomBankCsvRow {
  prompt: string;
  correct_answer: string;
  meta: { part_of_speech?: string };
}

// Header aliases: the spec'd Chinese headers plus ascii fallbacks.
const PROMPT_KEYS = ['中文', 'prompt'];
const ANSWER_KEYS = ['英文', 'correct_answer', 'answer'];
const POS_KEYS = ['詞性', 'pos', 'part_of_speech'];

// At least correct (1) + 3 distractors must be distinct to build a question.
export const MIN_DISTINCT_ANSWERS = 4;

export function parseCustomBankCsv(csv: string): CustomBankCsvRow[] {
  // Strip a UTF-8 BOM — Excel "Save as CSV" prepends one, which would
  // otherwise corrupt the first header cell (e.g. "﻿中文").
  const lines = csv.replace(/^﻿/, '').trim().split(/\r?\n/);
  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].split(',').map((cell) => cell.trim());
  const findCol = (keys: string[]) => header.findIndex((h) => keys.includes(h));
  const promptIdx = findCol(PROMPT_KEYS);
  const answerIdx = findCol(ANSWER_KEYS);
  const posIdx = findCol(POS_KEYS);

  if (promptIdx < 0) throw new Error('缺少欄位：中文');
  if (answerIdx < 0) throw new Error('缺少欄位：英文');

  const rows: CustomBankCsvRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const cells = lines[index].split(',').map((cell) => cell.trim());
    const prompt = cells[promptIdx] ?? '';
    const correctAnswer = cells[answerIdx] ?? '';

    if (!prompt && !correctAnswer) continue; // tolerate trailing blank lines

    if (!prompt || !correctAnswer) {
      throw new Error(`第 ${index} 列：中文與英文皆為必填`);
    }

    const pos = posIdx >= 0 ? (cells[posIdx] ?? '').trim() : '';
    rows.push({
      prompt,
      correct_answer: correctAnswer,
      meta: pos ? { part_of_speech: pos } : {},
    });
  }

  return rows;
}
