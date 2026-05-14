import { shouldUnlock } from '../../../../lib/roadmap/unlock';
import { ROADMAP_STAGE_QUESTION_COUNT } from '../../../../lib/roadmap/types';

describe('shouldUnlock', () => {
  it('returns true when correct >= 80% of total (12/15)', () => {
    expect(shouldUnlock(12, 15)).toBe(true);
    expect(shouldUnlock(13, 15)).toBe(true);
    expect(shouldUnlock(15, 15)).toBe(true);
  });

  it('returns false when correct < 80% of total (11/15)', () => {
    expect(shouldUnlock(11, 15)).toBe(false);
    expect(shouldUnlock(0, 15)).toBe(false);
  });

  it('defaults total to ROADMAP_STAGE_QUESTION_COUNT (15)', () => {
    expect(ROADMAP_STAGE_QUESTION_COUNT).toBe(15);
    expect(shouldUnlock(12)).toBe(true);
    expect(shouldUnlock(11)).toBe(false);
  });

  it('handles total=0 by returning false (degenerate case)', () => {
    expect(shouldUnlock(0, 0)).toBe(false);
  });

  it('throws when correct > total', () => {
    expect(() => shouldUnlock(16, 15)).toThrow();
  });

  it('throws on negative correct or total', () => {
    expect(() => shouldUnlock(-1, 15)).toThrow();
    expect(() => shouldUnlock(5, -1)).toThrow();
  });

  it('throws on fractional correct or total', () => {
    expect(() => shouldUnlock(11.5, 15)).toThrow();
    expect(() => shouldUnlock(12, 15.5)).toThrow();
  });
});
