// tests/unit/lib/ui/error/mapError.test.ts
import { mapError, ScreenError } from '../../../../../lib/ui/error/mapError';

describe('mapError', () => {
  it('maps network TypeError', () => {
    expect(mapError(new TypeError('Network request failed'))).toEqual<ScreenError>({
      kind: 'network',
      message: '網路連線異常，請檢查網路後重試。',
      cause: expect.anything(),
    });
  });

  it('maps Supabase 401 / 403 to auth', () => {
    const err = Object.assign(new Error('JWT expired'), { status: 401 });
    expect(mapError(err).kind).toBe('auth');
  });

  it('maps 500 to server', () => {
    const err = Object.assign(new Error('boom'), { status: 500 });
    expect(mapError(err).kind).toBe('server');
  });

  it('falls back to unknown', () => {
    expect(mapError(new Error('???')).kind).toBe('unknown');
  });

  it('handles non-Error inputs', () => {
    expect(mapError('weird').kind).toBe('unknown');
    expect(mapError(null).kind).toBe('unknown');
    expect(mapError(undefined).kind).toBe('unknown');
  });
});
