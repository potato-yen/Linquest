// lib/ui/forms/validators.ts
// Alphabet aligned with lib/classes/service.ts CLASS_CODE_ALPHABET.
const CLASS_CODE_ALPHABET_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

export const emailValidator = (s: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const passwordValidator = (s: string): boolean => s.length >= 8;

export const classCodeValidator = (s: string): boolean =>
  CLASS_CODE_ALPHABET_RE.test(s);
