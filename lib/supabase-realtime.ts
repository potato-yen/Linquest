import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

export type ManagedRealtimeChannel = Pick<RealtimeChannel, 'topic'> & {
  on: (...args: any[]) => ManagedRealtimeChannel;
  subscribe: (...args: any[]) => ManagedRealtimeChannel;
};

type RealtimeClientLike = Pick<SupabaseClient, 'getChannels'> & {
  channel: SupabaseClient['channel'];
  removeChannel: SupabaseClient['removeChannel'];
};

interface ManagedRealtimeChannelOptions<TChannel extends ManagedRealtimeChannel> {
  topic: string;
  options?: Parameters<RealtimeClientLike['channel']>[1];
  setup: (channel: TChannel) => TChannel;
  subscribe?: (channel: TChannel) => void;
  cleanup?: (channel: TChannel, client: RealtimeClientLike) => Promise<unknown> | unknown;
  onError?: (error: unknown) => void;
}

export function subscribeManagedRealtimeChannel<TChannel extends ManagedRealtimeChannel>(
  sb: RealtimeClientLike,
  options: ManagedRealtimeChannelOptions<TChannel>,
): () => void {
  let closed = false;
  let activeChannel: TChannel | null = null;

  void (async () => {
    const staleChannels = sb
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${options.topic}`);

    await Promise.all(
      staleChannels.map((channel) =>
        sb.removeChannel(channel).catch(() => 'error'),
      ),
    );

    if (closed) return;

    try {
      const channel = sb.channel(options.topic, options.options) as unknown as TChannel;
      activeChannel = options.setup(channel);
      if (options.subscribe) {
        options.subscribe(activeChannel);
      } else {
        activeChannel.subscribe();
      }
    } catch (error) {
      options.onError?.(error);
    }
  })();

  return () => {
    closed = true;
    if (!activeChannel) return;
    const channel = activeChannel;
    activeChannel = null;
    const cleanup = options.cleanup
      ? Promise.resolve(options.cleanup(channel, sb))
      : sb.removeChannel(channel as unknown as RealtimeChannel);
    void cleanup.catch(() => 'error');
  };
}
