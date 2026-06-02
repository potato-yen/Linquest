export interface MapHitTestViewport {
  width: number;
  height: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  scale: number;
  translateX: number;
  translateY: number;
}

export function viewportPointToSvgPoint(
  point: { x: number; y: number },
  viewport: MapHitTestViewport,
): { x: number; y: number } {
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const untransformedX = centerX + (point.x - viewport.translateX - centerX) / viewport.scale;
  const untransformedY = centerY + (point.y - viewport.translateY - centerY) / viewport.scale;

  const viewScale = Math.min(
    viewport.width / viewport.viewBoxWidth,
    viewport.height / viewport.viewBoxHeight,
  );
  const renderedW = viewport.viewBoxWidth * viewScale;
  const renderedH = viewport.viewBoxHeight * viewScale;
  const viewOffsetX = (viewport.width - renderedW) / 2;
  const viewOffsetY = (viewport.height - renderedH) / 2;

  return {
    x: (untransformedX - viewOffsetX) / viewScale,
    y: (untransformedY - viewOffsetY) / viewScale,
  };
}
