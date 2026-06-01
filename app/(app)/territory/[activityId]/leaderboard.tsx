import React, { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { ScreenScaffold, Text, Skeleton, ErrorState, Button } from '../../../../lib/ui/components';
import { SettlementBoard } from '../../../../lib/ui/components/SettlementBoard';
import { useScreenData } from '../../../../lib/ui/hooks/useScreenData';
import { getSupabaseClient } from '../../../../lib/supabase';
import { subscribeManagedRealtimeChannel } from '../../../../lib/supabase-realtime';
import { getActivityState } from '../../../../lib/territory/state';

export default function Leaderboard() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const sb = React.useRef(getSupabaseClient()).current;
  const { state, refresh } = useScreenData(
    (_signal) => getActivityState(sb, activityId),
    [activityId],
    { pollMs: 5000 },
  );
  const mapId = state.status === 'ready' ? state.data.map_id : null;

  useEffect(() => {
    if (!mapId) return;

    return subscribeManagedRealtimeChannel(sb, {
      topic: `leaderboard-sync:${mapId}`,
      setup: (channel) =>
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'hex_tiles',
            filter: `map_id=eq.${mapId}`,
          },
          () => {
            refresh();
          },
        ),
      onError: (error) => {
        console.warn('[territory] leaderboard sync setup failed', error);
      },
    });
  }, [mapId, refresh, sb]);

  if (state.status === 'loading') return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  if (state.status === 'error') return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  if (state.status === 'empty') return null;

  const data = state.data;
  const groupOwnedWeighted = (gid: string) =>
    data.tiles
      .filter((t) => t.owner_group_id === gid)
      .reduce((sum, t) => sum + (t.multiplier ?? 1), 0);

  const treasuryRanked = [...data.groups]
    .sort((a, b) => b.treasury - a.treasury)
    .map((g, i) => ({ group_id: g.id, name: g.name, color: g.color, rank: i + 1, value: g.treasury }));

  const territoryRanked = [...data.groups]
    .sort((a, b) => groupOwnedWeighted(b.id) - groupOwnedWeighted(a.id))
    .map((g, i) => ({
      group_id: g.id,
      name: g.name,
      color: g.color,
      rank: i + 1,
      value: groupOwnedWeighted(g.id),
    }));

  return (
    <ScreenScaffold scroll>
      <Button title="← 返回地圖" variant="ghost" onPress={() => router.back()} />
      <Text variant="h1">排行榜</Text>
      <SettlementBoard title="財政榜（國庫）" rankings={treasuryRanked} valueLabel="treasury" />
      <SettlementBoard title="領地榜" rankings={territoryRanked} valueLabel="tiles" />
    </ScreenScaffold>
  );
}
