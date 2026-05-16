import { axialToPixel, hexVertices, HEX_SIZE } from '../../../../lib/territory-ui/map-projection';

describe('axialToPixel (pointy-top)', () => {
  it('center hex at origin', () => {
    expect(axialToPixel(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('q=1, r=0 hex sits to the east of origin (Δx = √3·s)', () => {
    const p = axialToPixel(1, 0);
    expect(p.x).toBeCloseTo(HEX_SIZE * Math.sqrt(3), 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it('q=0, r=1 hex sits south-east (Δx = √3·s/2, Δy = 1.5·s)', () => {
    const p = axialToPixel(0, 1);
    expect(p.x).toBeCloseTo(HEX_SIZE * Math.sqrt(3) / 2, 5);
    expect(p.y).toBeCloseTo(HEX_SIZE * 1.5, 5);
  });
});

describe('hexVertices', () => {
  it('returns 6 comma-pairs joined by spaces', () => {
    const v = hexVertices(0, 0);
    expect(v.split(' ')).toHaveLength(6);
  });

  it('first and last vertices are not the same point (no closing duplicate)', () => {
    const verts = hexVertices(100, 100).split(' ');
    expect(verts[0]).not.toBe(verts[5]);
  });

  it('shared edge: hex (0,0) and (1,0) share two vertices', () => {
    const a = new Set(hexVertices(...Object.values(axialToPixel(0, 0)) as [number, number]).split(' '));
    const b = new Set(hexVertices(...Object.values(axialToPixel(1, 0)) as [number, number]).split(' '));
    const shared = [...a].filter((p) => b.has(p));
    expect(shared.length).toBe(2);
  });
});
