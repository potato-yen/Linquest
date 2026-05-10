import { distance } from '../../../../lib/territory/coords';
import { generateShape, mapDiameter } from '../../../../lib/territory/shape';

describe('shape generator', () => {
  it('returns approximately target_size tiles', () => {
    const tiles = generateShape(80);

    expect(tiles.length).toBeGreaterThanOrEqual(72);
    expect(tiles.length).toBeLessThanOrEqual(88);
  });

  it('produces near-circular hex shape', () => {
    const tiles = generateShape(80);
    const maxRadius = Math.max(...tiles.map((tile) => distance({ q: 0, r: 0 }, tile)));

    expect(maxRadius).toBeLessThanOrEqual(6);
  });

  it('mapDiameter is the max pairwise distance', () => {
    const tiles = generateShape(80);
    const diameter = mapDiameter(tiles);

    expect(diameter).toBeGreaterThan(0);
    expect(diameter).toBeLessThanOrEqual(12);
  });

  it('returns distinct coords', () => {
    const tiles = generateShape(50);

    expect(new Set(tiles.map((tile) => `${tile.q},${tile.r}`)).size).toBe(tiles.length);
  });
});
