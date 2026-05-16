// lib/ui/trail/trail-layout.ts
// Pure function: stage index → SVG (x, y). Trail snakes vertically, alternating sides.
export function stagePosition(opts: {
  stage: number;
  lastStage: number;
  viewport: { width: number; height: number };
  marginX?: number;
  marginY?: number;
}): { x: number; y: number } {
  const { stage, lastStage, viewport } = opts;
  const marginX = opts.marginX ?? 40;
  const marginY = opts.marginY ?? 60;

  const t = lastStage <= 1 ? 0 : (stage - 1) / (lastStage - 1);  // 0..1
  const y = viewport.height - marginY - t * (viewport.height - 2 * marginY);
  // Sinusoidal x for an organic snake; phase tied to stage so adjacent stages always alternate sides.
  const amp = (viewport.width - 2 * marginX) / 2;
  const x = viewport.width / 2 + amp * Math.sin((stage - 1) * 1.7);
  return { x, y };
}
