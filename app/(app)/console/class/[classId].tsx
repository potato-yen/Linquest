import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ScreenScaffold, Text, Skeleton, ErrorState, Card,
  Button, Pressable, Badge, SectionHeader, EmptyState,
} from '../../../../lib/ui/components';
import { useScreenData } from '../../../../lib/ui/hooks/useScreenData';
import { getSupabaseClient } from '../../../../lib/supabase';
import { listClassRoster, listMyClasses } from '../../../../lib/classes/service';
import { listMyActivities } from '../../../../lib/teacher-console/service';
import { space } from '../../../../lib/ui/tokens';

export default function ClassDetail() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const sb = getSupabaseClient();

  const { state, refresh } = useScreenData(async (_signal) => {
    const [classes, roster, activities] = await Promise.all([
      listMyClasses(sb),
      listClassRoster(sb, classId),
      listMyActivities(sb, classId),
    ]);
    const cls = classes.find((c) => c.id === classId);
    return { classCode: cls?.class_code ?? '', className: cls?.name ?? '班級', roster, activities };
  }, [classId]);

  // NOTE: loader always returns a non-null object so status === 'empty' won't naturally trigger.

  if (state.status === 'loading') {
    return (
      <ScreenScaffold>
        <Skeleton height={300} />
      </ScreenScaffold>
    );
  }
  if (state.status === 'error') {
    return (
      <ScreenScaffold>
        <ErrorState error={state.error} onRetry={refresh} />
      </ScreenScaffold>
    );
  }
  if (state.status === 'empty') {
    router.back();
    return null;
  }

  const { classCode, className, roster, activities } = state.data;

  return (
    <ScreenScaffold scroll>
      <View style={{ marginBottom: space[2] }}>
        <Button title="← 班級列表" variant="ghost" onPress={() => router.back()} />
      </View>
      <Text variant="h1">{className}</Text>

      <Card style={{ marginTop: space[3], alignItems: 'center' }}>
        <Text color="muted">班級代碼（學生加入用，可長按選取）</Text>
        <Text variant="h1" selectable>{classCode}</Text>
      </Card>

      <SectionHeader title={`學生名單（${roster.length}）`} />
      {roster.length === 0 ? (
        <EmptyState title="尚無學生" body="把班級代碼分享給學生，他們加入後會出現在這裡。" />
      ) : (
        roster.map((r) => (
          <Card key={r.user_id} style={{ marginTop: space[2] }}>
            <Text>{r.display_name ?? r.user_id}</Text>
            <Text color="muted">加入於 {new Date(r.joined_at).toLocaleString()}</Text>
          </Card>
        ))
      )}

      <SectionHeader title="活動" />
      <View style={{ marginTop: space[2] }}>
        <Button title="＋ 開新活動" onPress={() => router.push(`/console/class/${classId}/new`)} />
      </View>
      {activities.length === 0 ? (
        <EmptyState title="尚無活動" body="建立一輪領地佔領活動。" />
      ) : (
        activities.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(`/console/activity/${a.id}`)}>
            <Card style={{ marginTop: space[2], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>{a.name}</Text>
              <Badge>{a.status}</Badge>
            </Card>
          </Pressable>
        ))
      )}
    </ScreenScaffold>
  );
}
