import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase';
import { PresenceEntry } from './types';

type PresenceStateMap = Record<string, PresenceEntry[]>;

export interface PresenceChannelLike {
  presenceState(): PresenceStateMap;
}

export function joinActivityPresence(
  activityId: string,
  entry: Omit<PresenceEntry, 'last_active_at'>,
  sb: SupabaseClient = getSupabaseClient(),
): RealtimeChannel {
  const channel = sb.channel(`activity:${activityId}:presence`, {
    config: {
      presence: {
        key: entry.user_id,
      },
    },
  });

  return channel;
}

export async function leaveActivityPresence(channel: RealtimeChannel): Promise<void> {
  await channel.untrack();
  await channel.unsubscribe();
}

export function listOnlineOpponents(
  channel: PresenceChannelLike,
  myGroupId: string,
): PresenceEntry[] {
  const opponents = new Map<string, PresenceEntry>();
  Object.values(channel.presenceState())
    .flat()
    .forEach((entry) => {
      if (entry.group_id === myGroupId || entry.in_battle) return;
      opponents.set(entry.user_id, entry);
    });

  return [...opponents.values()];
}
