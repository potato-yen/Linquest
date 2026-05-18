import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MapScreen from '../../../app/(app)/territory/[activityId]/map';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockJoinActivityPresence = jest.fn();
const mockLeaveActivityPresence = jest.fn();
const mockGetActivityState = jest.fn(async () => ({
  activity_id: 'activity-1',
  status: 'active',
  next_refresh_at: '2026-05-18T12:00:00.000Z',
  next_tax_at: '2026-05-18T11:00:00.000Z',
  groups: [
    { id: 'group-1', name: '第一組', color: '#6B7D54', treasury: 100 },
    { id: 'group-2', name: '第二組', color: '#7E3A5A', treasury: 80 },
  ],
  tiles: [
    {
      id: 'tile-1',
      map_id: 'map-1',
      q: 0,
      r: 0,
      kind: 'normal',
      multiplier: null,
      owner_group_id: null,
      is_capital: false,
      protected_until: null,
      active_challenge_id: null,
      active_challenge_kind: null,
      active_challenge_user_id: null,
      active_challenge_until: null,
      active_battle_id: null,
      last_refresh_wave_id: null,
      last_taken_at: null,
    },
  ],
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ activityId: 'activity-1' }),
  router: {
    back: mockBack,
    push: mockPush,
  },
}));

jest.mock('../../../lib/ui/session/useSession', () => ({
  useSession: () => ({
    status: 'auth',
    user: {
      id: 'user-1',
      display_name: '測試玩家',
    },
  }),
}));

jest.mock('../../../lib/territory/state', () => ({
  getActivityState: (...args: unknown[]) => mockGetActivityState(...args),
}));

jest.mock('../../../lib/realtime-battle/presence', () => ({
  joinActivityPresence: (...args: unknown[]) => mockJoinActivityPresence(...args),
  leaveActivityPresence: (...args: unknown[]) => mockLeaveActivityPresence(...args),
  listOnlineOpponents: () => [],
}));

jest.mock('../../../lib/realtime-battle/service', () => ({
  sendBattleInvite: jest.fn(),
}));

jest.mock('../../../lib/territory/arbitrator', () => ({
  attemptCapture: jest.fn(),
  resolveChallenge: jest.fn(),
}));

jest.mock('../../../lib/ui/components', () => ({
  ScreenScaffold: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Text: ({ children }: { children?: React.ReactNode }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{children}</MockText>;
  },
  Skeleton: () => {
    const { Text: MockText } = require('react-native');
    return <MockText>loading</MockText>;
  },
  ErrorState: ({ error }: { error: { message: string } }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{error.message}</MockText>;
  },
  ScoreCard: ({ label, value }: { label: string; value: number }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{`${label}:${value}`}</MockText>;
  },
  ChoiceCard: ({ choice }: { choice: string }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{choice}</MockText>;
  },
  QuestionCard: ({ prompt }: { prompt: string }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{prompt}</MockText>;
  },
  Button: ({ title }: { title: string }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{title}</MockText>;
  },
  Sheet: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Countdown: ({ deadline }: { deadline: string | null }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{deadline ?? 'no-deadline'}</MockText>;
  },
}));

jest.mock('../../../lib/ui/components/TileDetailSheet', () => ({
  TileDetailSheet: () => null,
}));

jest.mock('../../../lib/ui/components/PresenceList', () => ({
  PresenceList: () => null,
}));

jest.mock('../../../lib/ui/components/MapCanvas', () => ({
  MapCanvas: () => {
    const { Text: MockText } = require('react-native');
    return <MockText>map-canvas</MockText>;
  },
}));

jest.mock('../../../lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }),
  }),
}));

describe('MapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps hook order stable when activity state loads', async () => {
    const { getByText } = render(<MapScreen />);

    await waitFor(() => {
      expect(getByText('國庫:0')).toBeTruthy();
      expect(getByText('map-canvas')).toBeTruthy();
    });
  });
});
