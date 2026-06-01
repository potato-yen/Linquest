export const MAP_MIN_SCALE = 1;
export const MAP_MAX_SCALE = 2.4;

export function clampMapScale(scale: number): number {
  'worklet';
  return Math.min(MAP_MAX_SCALE, Math.max(MAP_MIN_SCALE, scale));
}

export function getMapPanLimits(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
): { maxX: number; maxY: number } {
  'worklet';
  const clampedScale = clampMapScale(scale);
  return {
    maxX: (viewportWidth * (clampedScale - 1)) / 2,
    maxY: (viewportHeight * (clampedScale - 1)) / 2,
  };
}

export function clampMapTranslation(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
): { x: number; y: number } {
  'worklet';
  const { maxX, maxY } = getMapPanLimits(viewportWidth, viewportHeight, scale);
  const clampedX = Math.min(maxX, Math.max(-maxX, x));
  const clampedY = Math.min(maxY, Math.max(-maxY, y));
  return {
    x: Object.is(clampedX, -0) ? 0 : clampedX,
    y: Object.is(clampedY, -0) ? 0 : clampedY,
  };
}
