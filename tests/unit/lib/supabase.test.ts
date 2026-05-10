import { getSupabaseClient, resetSupabaseClientForTesting } from '../../../lib/supabase';

describe('supabase client', () => {
  afterEach(() => {
    resetSupabaseClientForTesting();
  });

  it('returns a singleton across calls', () => {
    const a = getSupabaseClient();
    const b = getSupabaseClient();
    expect(a).toBe(b);
  });

  it('throws if EXPO_PUBLIC_SUPABASE_URL is missing', () => {
    const original = process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    jest.resetModules();
    expect(() => require('../../../lib/supabase').getSupabaseClient()).toThrow(/SUPABASE_URL/);
    process.env.EXPO_PUBLIC_SUPABASE_URL = original;
  });
});
