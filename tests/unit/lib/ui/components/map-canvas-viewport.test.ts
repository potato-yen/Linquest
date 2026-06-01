import {
  clampMapScale,
  clampMapTranslation,
  getMapPanLimits,
  MAP_MAX_SCALE,
  MAP_MIN_SCALE,
} from '../../../../../lib/ui/components/map-canvas-viewport';

describe('map canvas viewport bounds', () => {
  it('clamps scale into the supported zoom range', () => {
    expect(clampMapScale(0.5)).toBe(MAP_MIN_SCALE);
    expect(clampMapScale(1.8)).toBe(1.8);
    expect(clampMapScale(5)).toBe(MAP_MAX_SCALE);
  });

  it('disables panning at base zoom', () => {
    expect(getMapPanLimits(1200, 800, 1)).toEqual({ maxX: 0, maxY: 0 });
    expect(clampMapTranslation(400, -300, 1200, 800, 1)).toEqual({ x: 0, y: 0 });
  });

  it('derives symmetric pan limits from the current scale', () => {
    expect(getMapPanLimits(1200, 800, 2)).toEqual({ maxX: 600, maxY: 400 });
  });

  it('clamps translation back inside the legal viewport window', () => {
    expect(clampMapTranslation(900, -700, 1200, 800, 2)).toEqual({ x: 600, y: -400 });
    expect(clampMapTranslation(120, -90, 1200, 800, 2)).toEqual({ x: 120, y: -90 });
  });
});
