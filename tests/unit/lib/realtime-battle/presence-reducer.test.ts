import { listOnlineOpponents } from '../../../../lib/realtime-battle/presence';

describe('realtime battle presence', () => {
  it('filters out same-group users and opponents already in battle', () => {
    const channel = {
      presenceState: () => ({
        'user-1': [
          {
            user_id: 'user-1',
            group_id: 'group-a',
            in_battle: false,
            last_active_at: '2026-05-11T10:00:00.000Z',
          },
        ],
        'user-2': [
          {
            user_id: 'user-2',
            group_id: 'group-b',
            in_battle: false,
            last_active_at: '2026-05-11T10:00:00.000Z',
          },
        ],
        'user-3': [
          {
            user_id: 'user-3',
            group_id: 'group-c',
            in_battle: true,
            last_active_at: '2026-05-11T10:00:00.000Z',
          },
        ],
      }),
    };

    expect(listOnlineOpponents(channel as never, 'group-a')).toEqual([
      {
        user_id: 'user-2',
        group_id: 'group-b',
        in_battle: false,
        last_active_at: '2026-05-11T10:00:00.000Z',
      },
    ]);
  });
});
