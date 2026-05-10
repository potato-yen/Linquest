import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is required');
  }

  if (!key) {
    throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.product === 'string' &&
    navigator.product === 'ReactNative'
  ) {
    require('react-native-url-polyfill/auto');
  }

  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return client;
}

export function resetSupabaseClientForTesting() {
  client = null;
}
