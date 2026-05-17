// Runtime distractor sampling for custom banks.
//
// Custom-bank questions store a placeholder ['','',''] in
// questions.distractors (the column is NOT NULL / len-3 and shared with
// official banks, so it can't simply be empty). At answer time we sample
// 3 distractors from the other correct answers in the same bank — the
// same approach roadmap uses (lib/roadmap/sheet-source.ts sampleDistractors).
//
// Self-contained (no roadmap import) so territory/battle don't couple to
// the roadmap module.

// Fisher-Yates, non-mutating. Mirror of lib/roadmap/shuffle.ts.
function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** True when a question carries no authored distractors (custom bank). */
export function needsSampledDistractors(distractors: string[] | null | undefined): boolean {
  return !distractors || distractors.filter((d) => d && d.trim() !== '').length < 3;
}

/**
 * Pick `n` distinct distractors from `answerPool`, excluding `correctAnswer`.
 * Falls back to whatever distinct alternatives exist if the pool is short
 * (caller guarantees >=4 distinct at bank-create time, but be defensive).
 */
export function sampleDistractors(
  answerPool: string[],
  correctAnswer: string,
  n = 3,
  rng: () => number = Math.random,
): string[] {
  const candidates = Array.from(
    new Set(answerPool.filter((a) => a && a !== correctAnswer)),
  );
  return shuffle(candidates, rng).slice(0, n);
}
