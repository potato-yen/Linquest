// lib/ui/trail/trail-path.ts
// Build an SVG cubic-bezier "d" string connecting all stage positions.
import { stagePosition } from './trail-layout';

export function buildTrailPath(opts: { lastStage: number; viewport: { width: number; height: number } }): string {
  const points = Array.from({ length: opts.lastStage }, (_, i) =>
    stagePosition({ stage: i + 1, lastStage: opts.lastStage, viewport: opts.viewport }),
  );
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], cur = points[i];
    const cx = (prev.x + cur.x) / 2;
    d += ` Q ${cx} ${prev.y} ${cur.x} ${cur.y}`;
  }
  return d;
}
