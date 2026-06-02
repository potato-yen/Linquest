import { viewportPointToSvgPoint } from '../../../../../lib/ui/components/map-canvas-hit-test';

describe('viewportPointToSvgPoint', () => {
  it('accounts for centered meet viewBox letterboxing', () => {
    expect(
      viewportPointToSvgPoint(
        { x: 100, y: 50 },
        {
          width: 200,
          height: 200,
          viewBoxWidth: 200,
          viewBoxHeight: 100,
          scale: 1,
          translateX: 0,
          translateY: 0,
        },
      ),
    ).toEqual({ x: 100, y: 0 });
  });

  it('inverts center-origin scale and map translation', () => {
    expect(
      viewportPointToSvgPoint(
        { x: 160, y: 120 },
        {
          width: 200,
          height: 200,
          viewBoxWidth: 200,
          viewBoxHeight: 200,
          scale: 2,
          translateX: 20,
          translateY: -20,
        },
      ),
    ).toEqual({ x: 120, y: 120 });
  });
});
