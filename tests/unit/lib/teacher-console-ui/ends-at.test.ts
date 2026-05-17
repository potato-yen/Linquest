import { endsAtFromDuration, MIN_OFFSET_MIN } from '../../../../lib/teacher-console-ui/ends-at';

describe('endsAtFromDuration', () => {
  it('computes ISO N days ahead', () => {
    const now = new Date('2026-05-17T00:00:00Z');
    expect(endsAtFromDuration({ days: 7, hours: 0 }, now)).toBe('2026-05-24T00:00:00.000Z');
  });
  it('rejects durations under the +5min floor', () => {
    const now = new Date('2026-05-17T00:00:00Z');
    expect(() => endsAtFromDuration({ days: 0, hours: 0 }, now)).toThrow('INVALID_ENDS_AT');
  });
  it('exposes the 5-minute floor constant', () => {
    expect(MIN_OFFSET_MIN).toBe(5);
  });
});
