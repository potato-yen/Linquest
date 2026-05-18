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

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        ...entry,
        last_active_at: new Date().toISOString(),
      });
    }
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
  busyUserIds: ReadonlySet<string> = new Set(),
): PresenceEntry[] {
  return Object.values(channel.presenceState())
    .flat()
    .filter((entry) => entry.group_id !== myGroupId && !entry.in_battle && !busyUserIds.has(entry.user_id));
}
