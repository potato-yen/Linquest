import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import BattleModal from '../../../app/battle/[battleId]';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockRemoveChannel = jest.fn();
const mockHeartbeatBattle = jest.fn().mockResolvedValue(undefined);
const mockSubmitBattleAnswer = jest.fn();
const mockJoinBattleRoom = jest.fn(() => ({ id: 'battle-room' }));

const mockBattleRow = {
  id: 'battle-1',
  activity_id: 'activity-1',
  tile_id: 'tile-1',
  challenger_user_id: 'user-1',
  defender_user_id: 'user-2',
  status: 'in_progress' as const,
  question_ids: ['q-1'],
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
};

const mockQuestions = [
  {
    id: 'q-1',
    prompt: '題目 1',
    correct_answer: 'apple',
    distractors: ['banana', 'cherry', 'date'],
    meta: {},
  },
];

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ battleId: 'battle-1' }),
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

jest.mock('../../../lib/realtime-battle/room', () => ({
  joinBattleRoom: (...args: any[]) => (mockJoinBattleRoom as any)(...args),
}));

jest.mock('../../../lib/realtime-battle/service', () => ({
  heartbeatBattle: (...args: any[]) => (mockHeartbeatBattle as any)(...args),
  submitBattleAnswer: (...args: any[]) => (mockSubmitBattleAnswer as any)(...args),
}));

jest.mock('../../../lib/ui/components', () => ({
  Text: ({ children }: { children?: React.ReactNode }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{children}</MockText>;
  },
  ScreenScaffold: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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
  Skeleton: () => {
    const { Text: MockText } = require('react-native');
    return <MockText>loading</MockText>;
  },
  ErrorState: ({ error }: { error: { message: string } }) => {
    const { Text: MockText } = require('react-native');
    return <MockText>{error.message}</MockText>;
  },
}));

jest.mock('../../../lib/ui/components/BattleScoreHeader', () => ({
  BattleScoreHeader: () => {
    const { Text: MockText } = require('react-native');
    return <MockText>score-header</MockText>;
  },
}));

jest.mock('../../../lib/ui/components/BattleWinFx', () => ({
  BattleWinFx: () => null,
}));

jest.mock('../../../lib/supabase', () => {
  const makeBuilder = (table: string) => {
    if (table === 'battles') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: mockBattleRow, error: null }),
          }),
        }),
      };
    }

    if (table === 'questions') {
      return {
        select: () => ({
          in: async () => ({ data: mockQuestions, error: null }),
        }),
      };
    }

    if (table === 'activities') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { question_bank_id: 'bank-1' }, error: null }),
          }),
        }),
      };
    }

    throw new Error(`unexpected table ${table}`);
  };

  return {
    getSupabaseClient: () => ({
      from: (table: string) => makeBuilder(table),
      removeChannel: mockRemoveChannel,
    }),
  };
});

describe('BattleModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJoinBattleRoom.mockReturnValue({ id: 'battle-room' });
    mockHeartbeatBattle.mockResolvedValue(undefined);
  });

  it('keeps hook order stable when loading resolves into a live battle', async () => {
    const { getByText } = render(<BattleModal />);

    await waitFor(() => {
      expect(getByText('題目 1')).toBeTruthy();
    });
  });
});
