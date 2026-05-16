// lib/ui/session/useSession.ts
import { useContext } from 'react';
import { SessionContext, SessionState } from './SessionContext';

export function useSession(): SessionState & { signOut: () => Promise<void> } {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return { ...ctx.state, signOut: ctx.signOut };
}
