import { ROADMAP_STAGE_QUESTION_COUNT, ROADMAP_UNLOCK_THRESHOLD } from './types';

export function shouldUnlock(
  firstRoundCorrect: number,
  total: number = ROADMAP_STAGE_QUESTION_COUNT,
): boolean {
  if (!Number.isFinite(firstRoundCorrect) || firstRoundCorrect < 0) {
    throw new Error(`shouldUnlock: firstRoundCorrect must be >= 0, got ${firstRoundCorrect}`);
  }
  if (!Number.isFinite(total) || total < 0) {
    throw new Error(`shouldUnlock: total must be >= 0, got ${total}`);
  }
  if (firstRoundCorrect > total) {
    throw new Error(
      `shouldUnlock: firstRoundCorrect (${firstRoundCorrect}) cannot exceed total (${total})`,
    );
  }
  if (total === 0) return false;
  return firstRoundCorrect / total >= ROADMAP_UNLOCK_THRESHOLD;
}
