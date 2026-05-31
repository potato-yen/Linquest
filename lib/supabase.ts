import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppError, DomainNamespace, parseAppError } from './errors';

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

export async function performSbCall<T>(
  sb: SupabaseClient,
  namespace: DomainNamespace,
  call: () => Promise<{ data: T | null; error: any }>,
): Promise<T> {
  const { data, error } = await call();
  if (error) {
    throw parseAppError(namespace, error);
  }
  return data as T;
}

export async function ensureAuth(sb: SupabaseClient): Promise<string> {
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user.id) {
    throw new AppError('AUTH', 'NOT_AUTHENTICATED', 'not authenticated');
  }
  return session.user.id;
}

export function resetSupabaseClientForTesting() {
  client = null;
}
