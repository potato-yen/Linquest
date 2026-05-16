// app/(app)/territory/index.tsx
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ScreenScaffold, Text, Skeleton, ErrorState, EmptyState, ListRow } from '../../../lib/ui/components';
import { useScreenData } from '../../../lib/ui/hooks/useScreenData';
import { useSession } from '../../../lib/ui/session/useSession';
import { getSupabaseClient } from '../../../lib/supabase';
import { space } from '../../../lib/ui/tokens';

interface ActivityRow { id: string; name: string; status: 'active' | 'ended' | 'draft'; ends_at: string; }

export default function TerritoryTab() {
  const s = useSession();
  const sb = getSupabaseClient();

  const { state, refresh } = useScreenData(async (_signal: AbortSignal) => {
    if (s.status !== 'auth') return null;
    const { data, error } = await sb
      .from('activities')
      .select('id, name, status, ends_at, groups!inner(group_members!inner(user_id))')
      .eq('groups.group_members.user_id', s.user.id)
      .neq('status', 'draft')
      .order('starts_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ActivityRow[];
  }, [s.status === 'auth' ? s.user.id : null], { isEmpty: (rows) => rows.length === 0 });

  return (
    <ScreenScaffold scroll>
      <Text variant="h1">領地戰</Text>
      {state.status === 'loading' ? <Skeleton height={140} /> :
       state.status === 'error' ? <ErrorState error={state.error} onRetry={refresh} /> :
       state.status === 'empty' ? (
        <EmptyState
          title="還沒有活動"
          body="加入老師建立的班級後，活動會出現在這裡。"
          ctaTitle="加入班級"
          onCtaPress={() => router.push('/(app)/territory/join')}
        />
      ) : (
        <View style={{ gap: space[2] }}>
          {state.data.map((a) => (
            <ListRow
              key={a.id}
              title={a.name}
              subtitle={a.status === 'active' ? `進行中 · 截止 ${new Date(a.ends_at).toLocaleString('zh-TW')}` : '已結束'}
              onPress={() => router.push(`/(app)/territory/${a.id}/${a.status === 'active' ? 'map' : 'settlement'}`)}
            />
          ))}
        </View>
      )}
    </ScreenScaffold>
  );
}
