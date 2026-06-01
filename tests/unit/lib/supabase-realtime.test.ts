import { subscribeManagedRealtimeChannel } from '../../../lib/supabase-realtime';

type FakeChannel = {
  topic: string;
  on: jest.MockedFunction<(type: string, filter: Record<string, unknown>, callback: () => void) => FakeChannel>;
  subscribe: jest.MockedFunction<() => FakeChannel>;
};

type FakeClient = {
  channel: jest.MockedFunction<(topic: string, options?: unknown) => FakeChannel>;
  getChannels: jest.MockedFunction<() => FakeChannel[]>;
  removeChannel: jest.MockedFunction<(channel: FakeChannel) => Promise<'ok'>>;
};

function makeChannel(topic: string): FakeChannel {
  const channel = {
    topic,
    on: jest.fn(),
    subscribe: jest.fn(),
  } as unknown as FakeChannel;
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  return channel;
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function makeClient(
  initialChannels: FakeChannel[] = [],
  removeImpl?: (channel: FakeChannel, removeFromStore: () => void) => Promise<'ok'>,
): FakeClient {
  const channels = [...initialChannels];

  const client: FakeClient = {
    channel: jest.fn((topic: string) => {
      const realtimeTopic = `realtime:${topic}`;
      const existing = channels.find((channel) => channel.topic === realtimeTopic);
      if (existing) return existing;

      const fresh = makeChannel(realtimeTopic);
      channels.push(fresh);
      return fresh;
    }),
    getChannels: jest.fn(() => [...channels]),
    removeChannel: jest.fn((channel: FakeChannel) => {
      const removeFromStore = () => {
        const index = channels.indexOf(channel);
        if (index >= 0) channels.splice(index, 1);
      };

      if (removeImpl) {
        return removeImpl(channel, removeFromStore);
      }

      removeFromStore();
      return Promise.resolve('ok');
    }),
  };

  return client;
}

describe('subscribeManagedRealtimeChannel', () => {
  it('removes stale same-topic channels before registering listeners on a fresh instance', async () => {
    const stale = makeChannel('realtime:map-sync:map-1');
    const client = makeClient([stale]);
    const onTileChanged = jest.fn();

    subscribeManagedRealtimeChannel(client as never, {
      topic: 'map-sync:map-1',
      setup: (channel) =>
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hex_tiles' },
          onTileChanged,
        ),
    });

    await flushMicrotasks();

    expect(client.removeChannel).toHaveBeenCalledWith(stale);
    expect(client.channel).toHaveBeenCalledWith('map-sync:map-1', undefined);

    const fresh = client.channel.mock.results[0]?.value as FakeChannel;
    expect(fresh).not.toBe(stale);
    expect(fresh.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hex_tiles' },
      onTileChanged,
    );
    expect(fresh.subscribe).toHaveBeenCalledTimes(1);
  });

  it('does not subscribe after cleanup if stale-channel removal is still in flight', async () => {
    const stale = makeChannel('realtime:battles-sync:activity-1');
    let resolveRemoval: (() => void) | null = null;
    const client = makeClient([stale], async (_channel, removeFromStore) =>
      new Promise<'ok'>((resolve) => {
        resolveRemoval = () => {
          removeFromStore();
          resolve('ok');
        };
      }),
    );

    const teardown = subscribeManagedRealtimeChannel(client as never, {
      topic: 'battles-sync:activity-1',
      setup: (channel) =>
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'battles' },
          jest.fn(),
        ),
    });

    teardown();
    const finishRemoval = resolveRemoval as (() => void) | null;
    if (finishRemoval) finishRemoval();
    await flushMicrotasks();

    expect(client.channel).not.toHaveBeenCalled();
  });
});
