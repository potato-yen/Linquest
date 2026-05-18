jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

import { buildInviteDeadline } from '../../../../../lib/ui/composites/BattleInviteRoot';

describe('buildInviteDeadline', () => {
  it('derives the countdown deadline from created_at plus the invite timeout window', () => {
    expect(buildInviteDeadline('2026-05-18T10:00:00.000Z')).toBe('2026-05-18T10:05:00.000Z');
  });
});
