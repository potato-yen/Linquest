import { groupPalette } from '../ui/tokens';

export function fallbackGroupColor(index: number): string {
  return groupPalette[index % groupPalette.length];
}
