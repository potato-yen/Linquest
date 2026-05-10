import {
  axialToString,
  distance,
  isAdjacent,
  neighbors,
} from '../../../../lib/territory/coords';

describe('hex coords', () => {
  it('neighbors returns 6 unique coords around origin', () => {
    const ns = neighbors({ q: 0, r: 0 });

    expect(ns).toHaveLength(6);
    expect(new Set(ns.map(axialToString)).size).toBe(6);
  });

  it('distance is 0 for same coord, 1 for neighbor', () => {
    expect(distance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    expect(distance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(distance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
    expect(distance({ q: 0, r: 0 }, { q: -1, r: 1 })).toBe(1);
  });

  it('distance respects axial cube formula on far points', () => {
    expect(distance({ q: 0, r: 0 }, { q: 3, r: -2 })).toBe(3);
    expect(distance({ q: -2, r: 4 }, { q: 1, r: -1 })).toBe(5);
  });

  it('isAdjacent matches distance==1', () => {
    expect(isAdjacent({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(true);
    expect(isAdjacent({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
    expect(isAdjacent({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(false);
  });
});
