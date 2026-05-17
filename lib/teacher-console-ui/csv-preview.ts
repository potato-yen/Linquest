import { parseBankCsv, ParsedRow } from '../question-bank/seed';

export type CsvPreview =
  | { ok: true; rows: ParsedRow[]; count: number }
  | { ok: false; message: string };

export function previewCsv(text: string): CsvPreview {
  if (!text || !text.trim()) {
    return { ok: false, message: 'CSV 內容為空' };
  }
  try {
    const rows = parseBankCsv(text);
    if (rows.length === 0) {
      return { ok: false, message: 'CSV 沒有任何題目資料列' };
    }
    return { ok: true, rows, count: rows.length };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'CSV 解析失敗' };
  }
}
