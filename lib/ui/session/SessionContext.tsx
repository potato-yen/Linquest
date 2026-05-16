// lib/ui/session/SessionContext.tsx
import React, { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '../../supabase';
import { getCurrentUser, signOut as authSignOut } from '../../auth/service';
import type { AuthUser } from '../../auth/types';

export type SessionState =
  | { status: 'loading' }
  | { status: 'unauth' }
  | { status: 'auth'; user: AuthUser };

type CtxValue = { state: SessionState; signOut: () => Promise<void> };

export const SessionContext = createContext<CtxValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const sb = useRef(getSupabaseClient()).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getCurrentUser(sb);
        if (cancelled) return;
        setState(user ? { status: 'auth', user } : { status: 'unauth' });
      } catch {
        if (cancelled) return;
        setState({ status: 'unauth' });
      }
    })();

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setState({ status: 'unauth' });
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          const user = await getCurrentUser(sb);
          setState(user ? { status: 'auth', user } : { status: 'unauth' });
        } catch {
          setState({ status: 'unauth' });
        }
      }
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [sb]);

  const value = useMemo<CtxValue>(() => ({
    state,
    signOut: async () => { await authSignOut(sb); setState({ status: 'unauth' }); },
  }), [state, sb]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
