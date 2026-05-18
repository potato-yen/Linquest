import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockAcceptBattleInvite = jest.fn();
const mockDeclineBattleInvite = jest.fn();
const mockBattleInviteToast = jest.fn(({ challengerName }: { challengerName: string }) => {
  const { Text: MockText } = require('react-native');
  return <MockText>{challengerName}</MockText>;
});
const mockMaybeSingle = jest.fn(async () => ({ data: null, error: null }));
const mockSingle = jest.fn(async () => ({ data: null, error: null }));
const mockSubscribe = jest.fn();
const mockRemoveChannel = jest.fn();

const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn(() => {
    mockSubscribe();
    return mockChannel;
  }),
};

const mockSb = {
  channel: jest.fn(() => mockChannel),
  removeChannel: mockRemoveChannel,
  from: jest.fn((table: string) => {
    if (table === 'battles') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                limit: jest.fn(() => ({
                  maybeSingle: mockMaybeSingle,
                })),
              })),
            })),
          })),
        })),
      };
    }

    if (table === 'users') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: mockSingle,
          })),
        })),
      };
    }

    if (table === 'group_members') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: mockMaybeSingle,
          })),
        })),
      };
    }

    throw new Error(`unexpected table ${table}`);
  }),
};

jest.mock('expo-router', () => ({
  router: {
    push: mockPush,
  },
}));

jest.mock('../../../../../lib/ui/session/useSession', () => ({
  useSession: () => ({
    status: 'auth',
    user: {
      id: 'defender-1',
    },
  }),
}));

jest.mock('../../../../../lib/supabase', () => ({
  getSupabaseClient: () => mockSb,
}));

jest.mock('../../../../../lib/realtime-battle/service', () => ({
  acceptBattleInvite: (...args: unknown[]) => mockAcceptBattleInvite(...args),
  declineBattleInvite: (...args: unknown[]) => mockDeclineBattleInvite(...args),
}));

jest.mock('../../../../../lib/ui/components/BattleInviteToast', () => ({
  BattleInviteToast: (props: unknown) => mockBattleInviteToast(props),
}));

import { BattleInviteRoot, buildInviteDeadline } from '../../../../../lib/ui/composites/BattleInviteRoot';

describe('buildInviteDeadline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: null, error: null });
  });

  it('derives the countdown deadline from created_at plus the invite timeout window', () => {
    expect(buildInviteDeadline('2026-05-18T10:00:00.000Z')).toBe('2026-05-18T10:05:00.000Z');
  });

  it('hydrates an existing pending invite on mount even before a new INSERT event arrives', async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({
        data: {
          id: 'battle-1',
          activity_id: 'activity-1',
          tile_id: 'tile-1',
          challenger_user_id: 'challenger-1',
          defender_user_id: 'defender-1',
          status: 'pending_invite',
          question_ids: [],
          current_index: 0,
          current_index_decided: false,
          reveal_at: null,
          question_deadline_at: null,
          challenger_score: 0,
          defender_score: 0,
          challenger_locked: [],
          defender_locked: [],
          challenger_last_heartbeat_at: null,
          defender_last_heartbeat_at: null,
          winner_user_id: null,
          abort_reason: null,
          ended_at: null,
          created_at: '2026-05-18T10:00:00.000Z',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { groups: { color: '#7E3A5A' } },
        error: null,
      });
    mockSingle.mockResolvedValueOnce({
      data: { display_name: '對手 A' },
      error: null,
    });

    render(<BattleInviteRoot />);

    await waitFor(() => {
      expect(mockBattleInviteToast).toHaveBeenCalledWith(
        expect.objectContaining({
          challengerName: '對手 A',
          challengerColor: '#7E3A5A',
          visible: true,
        }),
      );
    });
  });
});
