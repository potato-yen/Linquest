// lib/roadmap/sheet-source.ts
import { parseCsv } from './csv';
import { LEVEL_SHEET_TABS } from './roadmap-config';
import { shuffle } from './shuffle';
import { StageQuestion } from './types';

const ENV_KEY = 'EXPO_PUBLIC_GOOGLE_SHEET_SHARE_URL';

export function toGvizCsvUrl(shareUrl: string, tabName: string): string {
  const m = shareUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) {
    throw new Error(
      `toGvizCsvUrl: could not extract spreadsheet id from "${shareUrl}"`,
    );
  }
  const id = m[1];
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    tabName,
  )}`;
}

export function rowsToQuestions(
  rows: string[][],
  level: number,
): StageQuestion[] {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const promptIdx = col('prompt');
  const answerIdx = col('answer');
  if (promptIdx < 0) throw new Error(`sheet (Level${level}): missing column "prompt"`);
  if (answerIdx < 0) throw new Error(`sheet (Level${level}): missing column "answer"`);
  const exIdx = col('example_sentence');
  const exTrIdx = col('example_translation');
  const ipaIdx = col('ipa');

  const out: StageQuestion[] = [];
  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    const prompt = (cells[promptIdx] ?? '').trim();
    const answer = (cells[answerIdx] ?? '').trim();
    if (prompt === '' || answer === '') continue; // defensive: blank/trailing rows

    const meta: StageQuestion['meta'] = { roadmap_level: level };
    if (exIdx >= 0 && (cells[exIdx] ?? '').trim() !== '') {
      meta.example_sentence = cells[exIdx].trim();
    }
    if (exTrIdx >= 0 && (cells[exTrIdx] ?? '').trim() !== '') {
      (meta as Record<string, unknown>).example_translation =
        cells[exTrIdx].trim();
    }
    if (ipaIdx >= 0 && (cells[ipaIdx] ?? '').trim() !== '') {
      (meta as Record<string, unknown>).ipa = cells[ipaIdx].trim();
    }

    out.push({
      id: `sheet-L${level}-r${r}`,
      prompt,
      correct_answer: answer,
      distractors: [],
      meta,
    });
  }
  return out;
}

export function sampleDistractors(
  pool: StageQuestion[],
  correctAnswer: string,
  n: number,
  rng: () => number,
): string[] {
  const candidates = Array.from(
    new Set(
      pool.map((q) => q.correct_answer).filter((a) => a !== correctAnswer),
    ),
  );
  if (candidates.length < n) {
    throw new Error(
      `sampleDistractors: need ${n} distractors but pool has only ${candidates.length} distinct alternatives`,
    );
  }
  return shuffle(candidates, rng).slice(0, n);
}

let bankPromise: Promise<Record<number, StageQuestion[]>> | null = null;

export function resetSheetBankForTesting(): void {
  bankPromise = null;
}

export function loadSheetBank(): Promise<Record<number, StageQuestion[]>> {
  if (bankPromise) return bankPromise;

  bankPromise = (async () => {
    const shareUrl = process.env[ENV_KEY];
    if (!shareUrl) {
      throw new Error(`${ENV_KEY} is required (set it in .env)`);
    }

    const levels = Object.keys(LEVEL_SHEET_TABS).map((k) => Number(k));
    const entries = await Promise.all(
      levels.map(async (level) => {
        const url = toGvizCsvUrl(shareUrl, LEVEL_SHEET_TABS[level]);
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(
            `sheet fetch failed for Level${level} (${res.status}); ` +
              `is the sheet shared as "anyone with the link can view"?`,
          );
        }
        const text = await res.text();
        return [level, rowsToQuestions(parseCsv(text), level)] as const;
      }),
    );

    const bank: Record<number, StageQuestion[]> = {};
    for (const [level, qs] of entries) bank[level] = qs;
    return bank;
  })();

  // Don't cache a rejected promise.
  bankPromise.catch(() => {
    bankPromise = null;
  });

  return bankPromise;
}
