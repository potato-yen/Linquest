// tests/unit/lib/ui/session/SessionContext.test.tsx
import React from 'react';
import { Text } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import { SessionProvider } from '../../../../../lib/ui/session/SessionContext';
import { useSession } from '../../../../../lib/ui/session/useSession';

// Names must be `mock`-prefixed: babel-jest hoists jest.mock() and only allows
// out-of-scope refs whose names start with `mock` (case-insensitive).
const mockOnAuthStateChange = jest.fn();
let mockCurrentSession: any = null;

jest.mock('../../../../../lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: mockCurrentSession } }),
      onAuthStateChange: (cb: any) => {
        mockOnAuthStateChange.mockImplementation(cb);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      },
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'u1', email: 'a@b.co', role: 'student', display_name: 'A', created_at: '' }, error: null }) }) }),
    }),
  }),
}));

function Probe() {
  const s = useSession();
  return <Text testID="status">{s.status === 'auth' ? `auth:${s.user.id}` : s.status}</Text>;
}

beforeEach(() => { mockCurrentSession = null; mockOnAuthStateChange.mockReset(); });

describe('SessionContext', () => {
  it('starts loading then resolves to unauth when no session', async () => {
    const { getByTestId } = render(
      <SessionProvider><Probe /></SessionProvider>,
    );
    expect(getByTestId('status').props.children).toBe('loading');
    await waitFor(() => expect(getByTestId('status').props.children).toBe('unauth'));
  });

  it('resolves to auth when session exists', async () => {
    mockCurrentSession = { user: { id: 'u1' } };
    const { getByTestId } = render(
      <SessionProvider><Probe /></SessionProvider>,
    );
    await waitFor(() => expect(getByTestId('status').props.children).toBe('auth:u1'));
  });

  it('responds to onAuthStateChange SIGNED_OUT by clearing', async () => {
    mockCurrentSession = { user: { id: 'u1' } };
    const { getByTestId } = render(
      <SessionProvider><Probe /></SessionProvider>,
    );
    await waitFor(() => expect(getByTestId('status').props.children).toBe('auth:u1'));
    await act(async () => { mockOnAuthStateChange.getMockImplementation()?.('SIGNED_OUT', null); });
    await waitFor(() => expect(getByTestId('status').props.children).toBe('unauth'));
  });
});
