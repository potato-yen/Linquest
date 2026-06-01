export function supportsAnimatedCooldownPattern(platformOS: string): boolean {
  return platformOS === 'web';
}

export function shouldEnableMapPan(platformOS: string, scale: number): boolean {
  if (platformOS !== 'web') return true;
  return scale > 1.01;
}
