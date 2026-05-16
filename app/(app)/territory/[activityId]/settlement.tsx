import React from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ScreenScaffold, Text, Skeleton, ErrorState, Button,
} from '../../../../lib/ui/components';
import { SettlementBoard } from '../../../../lib/ui/components/SettlementBoard';
import { useScreenData } from '../../../../lib/ui/hooks/useScreenData';
import { getSupabaseClient } from '../../../../lib/supabase';
import { getActivitySettlement } from '../../../../lib/teacher-console/service';
import { space } from '../../../../lib/ui/tokens';

export default function Settlement() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const sb = getSupabaseClient();

  const { state, refresh } = useScreenData(
    (_signal: AbortSignal) => getActivitySettlement(sb, activityId),
    [activityId],
  );

  if (state.status === 'loading') return <ScreenScaffold><Skeleton height={400} /></ScreenScaffold>;
  if (state.status === 'error') return <ScreenScaffold><ErrorState error={state.error} onRetry={refresh} /></ScreenScaffold>;
  if (state.status === 'empty') return null;

  const { rankings_treasury, rankings_territory } = state.data;

  const treasuryRankings = rankings_treasury.map((r) => ({
    group_id: r.group_id,
    name: r.name,
    color: r.color,
    rank: r.rank,
    value: r.treasury,
  }));

  const territoryRankings = rankings_territory.map((r) => ({
    group_id: r.group_id,
    name: r.name,
    color: r.color,
    rank: r.rank,
    value: r.owned_count,
  }));

  return (
    <ScreenScaffold>
      <Button title="← 返回" variant="ghost" onPress={() => router.back()} />
      <ScrollView contentContainerStyle={{ gap: space[4], paddingBottom: space[7] }}>
        <Text variant="h1">結算</Text>
        <SettlementBoard title="財政總榜" rankings={treasuryRankings} valueLabel="treasury" />
        <SettlementBoard title="領地總榜" rankings={territoryRankings} valueLabel="tiles" />
      </ScrollView>
    </ScreenScaffold>
  );
}
