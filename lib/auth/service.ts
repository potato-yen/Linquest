import { Session, SupabaseClient } from '@supabase/supabase-js';
import { AuthUser, Role } from './types';

export interface SignUpInput {
  email: string;
  password: string;
  display_name?: string;
  role?: Role;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpResult {
  user_id: string;
  // Present when the project has email confirmation disabled: the user is
  // already signed in, so callers can skip the sign-in screen.
  session: Session | null;
}

export async function signUp(
  sb: SupabaseClient,
  input: SignUpInput,
): Promise<SignUpResult> {
  const { data, error } = await sb.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.display_name,
        role: input.role ?? 'student',
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('signUp returned no user');
  }

  return { user_id: data.user.id, session: data.session ?? null };
}

export async function signIn(
  sb: SupabaseClient,
  input: SignInInput,
): Promise<Session | null> {
  const { data, error } = await sb.auth.signInWithPassword(input);

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signOut(sb: SupabaseClient): Promise<void> {
  const { error } = await sb.auth.signOut();

  if (error) {
    throw error;
  }
}

// Update the signed-in user's display name. RLS policy
// "users can update their own profile" scopes the write to auth.uid().
// Only public.users is touched — that is what the app reads everywhere
// (getCurrentUser, roster, presence); auth metadata is signup-only.
export async function updateDisplayName(
  sb: SupabaseClient,
  displayName: string,
): Promise<void> {
  const {
    data: { session },
  } = await sb.auth.getSession();
  const uid = session?.user.id;
  if (!uid) {
    throw new Error('not authenticated');
  }

  const { error } = await sb
    .from('users')
    .update({ display_name: displayName })
    .eq('id', uid);

  if (error) {
    throw error;
  }
}

export async function getCurrentUser(
  sb: SupabaseClient,
): Promise<AuthUser | null> {
  const {
    data: { session },
  } = await sb.auth.getSession();

  const sessionUser = session?.user;
  if (!sessionUser) {
    return null;
  }

  const { data, error } = await sb
    .from('users')
    .select('*')
    .eq('id', sessionUser.id)
    .single();

  if (error) {
    throw error;
  }

  return data as AuthUser;
}
