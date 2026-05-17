import {
  needsSampledDistractors,
  sampleDistractors,
} from '../../../../lib/answering/sample-distractors';

describe('needsSampledDistractors', () => {
  it('is true for the custom-bank placeholder', () => {
    expect(needsSampledDistractors(['', '', ''])).toBe(true);
    expect(needsSampledDistractors([])).toBe(true);
    expect(needsSampledDistractors(null)).toBe(true);
  });

  it('is false when 3 real distractors are present', () => {
    expect(needsSampledDistractors(['a', 'b', 'c'])).toBe(false);
  });
});

describe('sampleDistractors', () => {
  const pool = ['apple', 'banana', 'cat', 'dog', 'egg'];

  it('returns n distinct entries excluding the correct answer', () => {
    const seq = [0, 0, 0];
    let i = 0;
    const out = sampleDistractors(pool, 'apple', 3, () => seq[i++ % seq.length]);
    expect(out).toHaveLength(3);
    expect(out).not.toContain('apple');
    expect(new Set(out).size).toBe(3);
  });

  it('dedupes the pool and never includes the correct answer', () => {
    const out = sampleDistractors(['x', 'x', 'y', 'correct'], 'correct', 3, () => 0);
    expect(out).not.toContain('correct');
    expect(new Set(out).size).toBe(out.length);
  });
});
