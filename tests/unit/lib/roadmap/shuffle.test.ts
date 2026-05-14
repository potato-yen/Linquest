import { shuffle } from '../../../../lib/roadmap/shuffle';

describe('shuffle', () => {
  it('returns a new array with the same length', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, Math.random);
    expect(out).toHaveLength(input.length);
  });

  it('is a permutation of the input (same multiset)', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f'];
    const out = shuffle(input, Math.random);
    expect(out.slice().sort()).toEqual(input.slice().sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5];
    const snapshot = input.slice();
    shuffle(input, Math.random);
    expect(input).toEqual(snapshot);
  });

  it('is deterministic given a deterministic rng', () => {
    const input = [1, 2, 3, 4, 5];
    const rng1 = makeSeqRng([0.1, 0.5, 0.9, 0.3]);
    const rng2 = makeSeqRng([0.1, 0.5, 0.9, 0.3]);
    const out = shuffle(input, rng1);
    expect(out).toEqual(shuffle(input, rng2));
    expect(out).not.toEqual(input);
  });

  it('handles empty array', () => {
    expect(shuffle([], Math.random)).toEqual([]);
  });

  it('handles single-element array', () => {
    expect(shuffle([42], Math.random)).toEqual([42]);
  });
});

function makeSeqRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}
