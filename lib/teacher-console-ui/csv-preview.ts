import {
  MIN_CUSTOM_BANK_ROWS,
  parseCustomBankCsv,
  CustomBankCsvRow,
  MIN_DISTINCT_ANSWERS,
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
    if (rows.length < MIN_CUSTOM_BANK_ROWS) {
      return {
        ok: false,
        message: `活動題庫至少需 ${MIN_CUSTOM_BANK_ROWS} 題，才足夠支援 territory 最大挑戰題數，目前只有 ${rows.length} 題`,
      };
    }
    const distinct = new Set(rows.map((r) => r.correct_answer)).size;
    if (distinct < MIN_DISTINCT_ANSWERS) {
      return {
        ok: false,
        message: `英文答案至少需 ${MIN_DISTINCT_ANSWERS} 個不重複（誘答會從其他題抽），目前只有 ${distinct} 個`,
      };
    }
    return { ok: true, rows, count: rows.length };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'CSV 解析失敗' };
  }
}
