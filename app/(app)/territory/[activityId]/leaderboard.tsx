import React from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { ScreenScaffold, Text, Skeleton, ErrorState, Button } from '../../../../lib/ui/components';
import { SettlementBoard } from '../../../../lib/ui/components/SettlementBoard';
import { useScreenData } from '../../../../lib/ui/hooks/useScreenData';
import { getSupabaseClient } from '../../../../lib/supabase';
import { getActivityState } from '../../../../lib/territory/state';

export default function Leaderboard() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const sb = getSupabaseClient();
  const { state, refresh } = useScreenData(
    (_signal) => getActivityState(sb, activityId),
    [activityId],
    { pollMs: 5000 },
  );

  if (state.status === 'loading') return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  if (state.status === 'error') return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  if (state.status === 'empty') return null;

  const data = state.data;
  const groupOwned = (gid: string) => data.tiles.filter((t) => t.owner_group_id === gid).length;

  const treasuryRanked = [...data.groups]
    .sort((a, b) => b.treasury - a.treasury)
    .map((g, i) => ({ group_id: g.id, name: g.name, color: g.color, rank: i + 1, value: g.treasury }));

  const territoryRanked = [...data.groups]
    .sort((a, b) => groupOwned(b.id) - groupOwned(a.id))
    .map((g, i) => ({ group_id: g.id, name: g.name, color: g.color, rank: i + 1, value: groupOwned(g.id) }));

  return (
    <ScreenScaffold scroll>
      <Button title="← 返回地圖" variant="ghost" onPress={() => router.back()} />
      <Text variant="h1">排行榜</Text>
      <SettlementBoard title="財政榜（國庫）" rankings={treasuryRanked} valueLabel="treasury" />
      <SettlementBoard title="領地榜" rankings={territoryRanked} valueLabel="tiles" />
    </ScreenScaffold>
  );
}
