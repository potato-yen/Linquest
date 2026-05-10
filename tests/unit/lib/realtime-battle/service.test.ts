import {
  acceptBattleInvite,
  declineBattleInvite,
  heartbeatBattle,
  sendBattleInvite,
  submitBattleAnswer,
} from '../../../../lib/realtime-battle/service';
import { BattleError } from '../../../../lib/realtime-battle/errors';

function makeSb() {
  return {
    rpc: jest.fn(),
  };
}

describe('realtime battle service', () => {
  it('sends battle invites through the dedicated RPC', async () => {
    const sb = makeSb();
    sb.rpc.mockResolvedValue({ data: 'battle-1', error: null });

    await expect(
      sendBattleInvite(sb as never, {
        activity_id: 'activity-1',
        tile_id: 'tile-1',
        defender_user_id: 'user-2',
      }),
    ).resolves.toBe('battle-1');

    expect(sb.rpc).toHaveBeenCalledWith('send_battle_invite', {
      p_activity_id: 'activity-1',
      p_tile_id: 'tile-1',
      p_defender_user_id: 'user-2',
    });
  });

  it('forwards accept/decline/heartbeat/submit to their RPC names', async () => {
    const sb = makeSb();
    sb.rpc.mockResolvedValue({ data: null, error: null });
    sb.rpc.mockResolvedValueOnce({ data: null, error: null });
    sb.rpc.mockResolvedValueOnce({ data: null, error: null });
    sb.rpc.mockResolvedValueOnce({ data: 'correct_first', error: null });
    sb.rpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(acceptBattleInvite(sb as never, 'battle-1')).resolves.toBeUndefined();
    await expect(declineBattleInvite(sb as never, 'battle-1')).resolves.toBeUndefined();
    await expect(
      submitBattleAnswer(sb as never, {
        battle_id: 'battle-1',
        question_index: 2,
        choice: 'A',
        response_ms: 812,
      }),
    ).resolves.toBe('correct_first');
    await expect(heartbeatBattle(sb as never, 'battle-1')).resolves.toBeUndefined();

    expect(sb.rpc).toHaveBeenNthCalledWith(1, 'accept_battle_invite', {
      p_battle_id: 'battle-1',
    });
    expect(sb.rpc).toHaveBeenNthCalledWith(2, 'decline_battle_invite', {
      p_battle_id: 'battle-1',
    });
    expect(sb.rpc).toHaveBeenNthCalledWith(3, 'submit_battle_answer', {
      p_battle_id: 'battle-1',
      p_question_index: 2,
      p_choice: 'A',
      p_response_ms: 812,
    });
    expect(sb.rpc).toHaveBeenNthCalledWith(4, 'heartbeat_battle', {
      p_battle_id: 'battle-1',
    });
  });

  it('maps rpc failures into BattleError instances', async () => {
    const sb = makeSb();
    sb.rpc.mockResolvedValue({
      data: null,
      error: { message: 'QUESTION_POOL_TOO_SMALL' },
    });

    await expect(
      sendBattleInvite(sb as never, {
        activity_id: 'activity-1',
        tile_id: 'tile-1',
        defender_user_id: 'user-2',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<BattleError>>({
        name: 'BattleError',
        code: 'QUESTION_POOL_TOO_SMALL',
      }),
    );
  });
});
