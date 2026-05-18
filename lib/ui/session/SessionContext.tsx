// lib/ui/session/SessionContext.tsx
import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '../../supabase';
import { getCurrentUser, signOut as authSignOut } from '../../auth/service';
import type { AuthUser } from '../../auth/types';

export type SessionState =
  | { status: 'loading' }
  | { status: 'unauth' }
  | { status: 'auth'; user: AuthUser };

type CtxValue = {
  state: SessionState;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const SessionContext = createContext<CtxValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const sb = useRef(getSupabaseClient()).current;

  // Single source of truth for "(re)load the current user into state".
  const loadUser = useCallback(async () => {
    try {
      const user = await getCurrentUser(sb);
      setState(user ? { status: 'auth', user } : { status: 'unauth' });
    } catch {
      setState({ status: 'unauth' });
    }
  }, [sb]);

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setState({ status: 'unauth' });
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser();
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [sb, loadUser]);

  const value = useMemo<CtxValue>(() => ({
    state,
    signOut: async () => { await authSignOut(sb); setState({ status: 'unauth' }); },
    refreshUser: loadUser,
  }), [state, sb, loadUser]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
