// app/(app)/me/classes.tsx
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ScreenScaffold, Text, Skeleton, ErrorState, EmptyState, ListRow } from '../../../lib/ui/components';
import { useScreenData } from '../../../lib/ui/hooks/useScreenData';
import { getSupabaseClient } from '../../../lib/supabase';
import { listMyClasses } from '../../../lib/classes/service';
import { space } from '../../../lib/ui/tokens';

export default function MyClasses() {
  const sb = getSupabaseClient();
  const { state, refresh } = useScreenData(
    (_signal) => listMyClasses(sb),
    [],
    { isEmpty: (cs) => cs.length === 0 },
  );

  return (
    <ScreenScaffold scroll>
      <Text variant="h1">我的班級</Text>
      {state.status === 'loading' ? <Skeleton height={120} /> :
       state.status === 'error' ? <ErrorState error={state.error} onRetry={refresh} /> :
       state.status === 'empty' ? (
        <EmptyState
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
