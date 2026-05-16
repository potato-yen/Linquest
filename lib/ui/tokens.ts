// lib/ui/tokens.ts — single source of truth for design tokens (spec §3)
import { Platform } from 'react-native';

export const color = {
  bg: {
    base: '#F5EFE0',
    surface: '#FAF6EE',
    muted: '#EFE5CF',
    sunken: '#E3DDC8',
  },
  text: {
    primary: '#2C3E1F',
    secondary: '#5D6E48',
    muted: '#8A8270',
    onPrimary: '#FAF6EE',
  },
  brand: {
    primary: '#6B7D54',
    primaryHover: '#566744',
    primaryMuted: '#A8B898',
  },
  accent: {
    warm: '#B8543A',
    warmMuted: '#E8C5B8',
  },
} as const;

// Group palette mirrors lib/teacher-console TEACHER_CONSOLE_DEFAULTS.group_color_palette.
// UI never re-defines group colors; service layer is the source of truth.
export const groupPalette = [
  '#7E5A3A', '#5A7E3A', '#3A5A7E', '#7E3A5A', '#3A7E5A',
  '#7E7E3A', '#3A7E7E', '#7E3A3A', '#5A3A7E', '#3A3A7E',
] as const;

export const tile = {
  neutral: { fill: '#E3DDC8', alpha: 0.6, stroke: '#8A8270', strokeW: 0.5, dashed: true },
  ownedSelf: { alpha: 0.55, stroke: '#2C3E1F', strokeW: 2 },
  ownedOther: { alpha: 0.4, strokeW: 1 }, // stroke = fill
  multiplierEdge: { stroke: '#D4AC4A', strokeW: 2.5 },
  capitalEdge: { stroke: '#2C3E1F', strokeW: 3, alpha: 0.7 },
  specialBadge: { color: '#8A4A3A' },
  cooldownMask: { alpha: 0.2, color: '#8A8270' },
  refreshGlow: { color: '#FAF6EE', alpha: 0.6, blurRadius: 8 },
} as const;

export const font = {
  serif: 'CormorantGaramond_500Medium',
  sans: 'Inter_400Regular',
  cjk: Platform.select({ ios: 'PingFangTC-Regular', default: 'sans-serif' })!,
  monoNum: Platform.select({ ios: 'Menlo', default: 'monospace' })!,
} as const;

export const type = {
  h1: { fontFamily: font.serif, fontSize: 28, lineHeight: 36 },
  h2: { fontFamily: font.serif, fontSize: 22, lineHeight: 30 },
  h3: { fontFamily: font.serif, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: font.sans, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: font.sans, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.sans, fontSize: 11, lineHeight: 14, letterSpacing: 0.88, textTransform: 'uppercase' as const },
  num: { fontFamily: font.monoNum, fontSize: 18, fontVariant: ['tabular-nums' as const] },
};

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;

export const radius = { sm: 4, md: 8, lg: 14, xl: 20 } as const;

export const shadow = {
  soft: {
    shadowColor: '#2C3E1F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  softer: {
    shadowColor: '#2C3E1F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

export const motion = {
  duration: { fast: 200, base: 300, slow: 400 },
  // Reanimated easing input — convert to Easing.bezier() at use-site.
  ease: { out: [0.2, 0.8, 0.2, 1] as const, inOut: [0.4, 0, 0.2, 1] as const },
} as const;

export type Tokens = {
  color: typeof color; tile: typeof tile; font: typeof font;
  type: typeof type; space: typeof space; radius: typeof radius;
  shadow: typeof shadow; motion: typeof motion;
};
