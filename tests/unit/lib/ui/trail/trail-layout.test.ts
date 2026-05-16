// tests/unit/lib/ui/trail/trail-layout.test.ts
import { stagePosition } from '../../../../../lib/ui/trail/trail-layout';

describe('stagePosition', () => {
  it('first stage anchors near bottom', () => {
    const p = stagePosition({ stage: 1, lastStage: 18, viewport: { width: 320, height: 1000 } });
    expect(p.y).toBeGreaterThan(800);
  });

  it('last stage anchors near top', () => {
    const p = stagePosition({ stage: 18, lastStage: 18, viewport: { width: 320, height: 1000 } });
    expect(p.y).toBeLessThan(200);
  });

  it('alternates left/right horizontally', () => {
    const a = stagePosition({ stage: 2, lastStage: 18, viewport: { width: 320, height: 1000 } }).x;
    const b = stagePosition({ stage: 3, lastStage: 18, viewport: { width: 320, height: 1000 } }).x;
    expect(Math.sign(a - 160) !== Math.sign(b - 160)).toBe(true);  // opposite sides of midline
  });
});
