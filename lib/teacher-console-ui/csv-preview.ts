import {
  parseCustomBankCsv,
  CustomBankCsvRow,
  MIN_DISTINCT_ANSWERS,
  MIN_TOTAL_QUESTIONS,
} from './custom-bank-csv';

export type CsvPreview =
  | { ok: true; rows: CustomBankCsvRow[]; count: number }
  | { ok: false; message: string };

export function previewCsv(text: string): CsvPreview {
  if (!text || !text.trim()) {
    return { ok: false, message: 'CSV 內容為空' };
  }
  try {
    const rows = parseCustomBankCsv(text);
    if (rows.length === 0) {
      return { ok: false, message: 'CSV 沒有任何題目資料列' };
    }
    
    // 1. Total count check (must support largest territory challenge = 18)
    if (rows.length < MIN_TOTAL_QUESTIONS) {
      return {
        ok: false,
        message: `自訂題庫題數不足，至少需要 ${MIN_TOTAL_QUESTIONS} 題才能支援所有領地挑戰。`,
      };
    }

    // 2. Distinctness check (must support 3 sampled distractors)
    const distinct = new Set(rows.map((r) => r.correct_answer)).size;
    if (distinct < MIN_DISTINCT_ANSWERS) {
      return {
        ok: false,
        message: `答案種類不足，至少需要 ${MIN_DISTINCT_ANSWERS} 個不重複的英文答案（誘答會從其他題抽樣），目前只有 ${distinct} 個。`,
      };
    }
    
    return { ok: true, rows, count: rows.length };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'CSV 解析失敗' };
  }
}
