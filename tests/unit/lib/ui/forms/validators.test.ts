// tests/unit/lib/ui/forms/validators.test.ts
import { emailValidator, passwordValidator, classCodeValidator } from '../../../../../lib/ui/forms/validators';

describe('emailValidator', () => {
  it('accepts a basic email', () => {
    expect(emailValidator('a@b.co')).toBe(true);
  });
  it('rejects empty string', () => {
    expect(emailValidator('')).toBe(false);
  });
  it('rejects missing @', () => {
    expect(emailValidator('foo.bar')).toBe(false);
  });
  it('rejects whitespace inside', () => {
    expect(emailValidator('a b@c.d')).toBe(false);
  });
});

describe('passwordValidator', () => {
  it('rejects shorter than 8', () => {
    expect(passwordValidator('1234567')).toBe(false);
  });
  it('accepts 8 chars', () => {
    expect(passwordValidator('12345678')).toBe(true);
  });
});

describe('classCodeValidator', () => {
  it('accepts 6 chars from CLASS_CODE_ALPHABET', () => {
    expect(classCodeValidator('ABCDEF')).toBe(true);
    expect(classCodeValidator('234567')).toBe(true);
  });
  it('rejects lowercase', () => {
    expect(classCodeValidator('abcdef')).toBe(false);
  });
  it('rejects ambiguous chars (I, O, 0, 1)', () => {
    expect(classCodeValidator('IIIIII')).toBe(false);
    expect(classCodeValidator('000000')).toBe(false);
  });
  it('rejects wrong length', () => {
    expect(classCodeValidator('ABCDE')).toBe(false);
    expect(classCodeValidator('ABCDEFG')).toBe(false);
  });
});
