// Pointy-top axial → screen pixel projection.
export const HEX_SIZE = 20;
export const HEX_W = HEX_SIZE * Math.sqrt(3);
export const ROW_STEP = HEX_SIZE * 1.5;

export function axialToPixel(q: number, r: number, origin = { x: 0, y: 0 }): { x: number; y: number } {
  return {
    x: origin.x + HEX_W * (q + r / 2),
    y: origin.y + ROW_STEP * r,
  };
}

export function hexVertices(cx: number, cy: number, s: number = HEX_SIZE): string {
  const half = s * Math.sqrt(3) / 2;
  const round = (n: number) => Number(n.toFixed(3));
  return [
    [cx + half, cy + s / 2],
    [cx,        cy + s    ],
    [cx - half, cy + s / 2],
    [cx - half, cy - s / 2],
    [cx,        cy - s    ],
    [cx + half, cy - s / 2],
  ].map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
}
