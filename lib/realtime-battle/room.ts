import { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase';
import { BattleRoomState, BattleRow } from './types';

export type BattleRoomMutation =
  | {
      type: 'row';
      row: BattleRow;
    }
  | {
      type: 'broadcast';
      event: string;
      payload: unknown;
      at?: string;
    };

export function reduceBattleRoomState(
  state: BattleRoomState,
  mutation: BattleRoomMutation,
): BattleRoomState {
  if (mutation.type === 'row') {
    return {
      ...state,
      row: mutation.row,
    };
  }

  return {
    ...state,
    last_event: {
      type: mutation.event,
      payload: mutation.payload,
      at: mutation.at ?? new Date().toISOString(),
    },
  };
}

export function joinBattleRoom(
  battleId: string,
  onChange: (state: BattleRoomState) => void,
  sb: SupabaseClient = getSupabaseClient(),
): RealtimeChannel {
  let state: BattleRoomState = { row: null };

  const channel = sb
    .channel(`battle:${battleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'battles',
        filter: `id=eq.${battleId}`,
      },
      (payload: RealtimePostgresChangesPayload<BattleRow>) => {
        if (!payload.new) {
          return;
        }

        state = reduceBattleRoomState(state, {
          type: 'row',
          row: payload.new as BattleRow,
        });
        onChange(state);
      },
    )
    .on('broadcast', { event: '*' }, ({ event, payload }) => {
      state = reduceBattleRoomState(state, {
        type: 'broadcast',
        event,
        payload,
      });
      onChange(state);
    });

  channel.subscribe();

  return channel;
}
