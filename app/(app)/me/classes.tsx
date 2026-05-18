// app/(app)/me/classes.tsx
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ScreenScaffold, Text, Skeleton, ErrorState, EmptyState, ListRow } from '../../../lib/ui/components';
import { illustrations } from '../../../lib/ui/illustrations';
import { useScreenData } from '../../../lib/ui/hooks/useScreenData';
import { useSession } from '../../../lib/ui/session/useSession';
import { getSupabaseClient } from '../../../lib/supabase';
import { space } from '../../../lib/ui/tokens';

interface ClassRow { id: string; name: string; class_code: string; }

export default function MyClasses() {
  const s = useSession();
  const sb = getSupabaseClient();
  const { state, refresh } = useScreenData(
    async (_signal) => {
      if (s.status !== 'auth') return null;
      const { data, error } = await sb
        .from('class_members')
        .select('class_id, classes(id, name, class_code)')
        .eq('user_id', s.user.id);
      if (error) throw error;
      return (data ?? []).flatMap((m) => {
        const c = (m as { classes?: ClassRow | ClassRow[] | null }).classes;
        return c ? (Array.isArray(c) ? c : [c]) : [];
      });
    },
    [s.status === 'auth' ? s.user.id : null],
    { isEmpty: (cs) => cs.length === 0 },
  );

  return (
    <ScreenScaffold scroll>
      <Text variant="h1">我的班級</Text>
      {state.status === 'loading' ? <Skeleton height={120} /> :
       state.status === 'error' ? <ErrorState error={state.error} onRetry={refresh} /> :
       state.status === 'empty' ? (
        <EmptyState
          illustration={illustrations.empty.noClass}
          title="還沒加入班級"
          body="輸入老師提供的 6 位代碼即可加入。"
          ctaTitle="加入班級"
          onCtaPress={() => router.push('/(app)/territory/join')}
        />
      ) : (
        <View style={{ gap: space[2] }}>
          {state.data.map((c) => (
            <ListRow key={c.id} title={c.name} subtitle={`代碼 ${c.class_code}`} />
          ))}
        </View>
      )}
    </ScreenScaffold>
  );
}
