// lib/ui/theme.ts — single light theme for v1; prepares useTheme() for future dark mode.
import * as tokens from './tokens';

export const lightTheme = tokens;
export type Theme = typeof lightTheme;

export function useTheme(): Theme {
  return lightTheme;
}
