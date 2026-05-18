import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ScreenScaffold, Text, Skeleton, ErrorState, Card,
  Button, Pressable, Badge, SectionHeader, EmptyState, DialogPrompt,
} from '../../../../lib/ui/components';
import { illustrations } from '../../../../lib/ui/illustrations';
import { useScreenData } from '../../../../lib/ui/hooks/useScreenData';
import { getSupabaseClient } from '../../../../lib/supabase';
import { listClassRoster, listMyClasses, deleteClass } from '../../../../lib/classes/service';
import { listMyActivities } from '../../../../lib/teacher-console/service';
import { classDeleteConfirmPlan } from '../../../../lib/teacher-console-ui';
import { mapError } from '../../../../lib/ui/error/mapError';
import { RosterTable } from '../../../../lib/ui/composites/RosterTable';
import { space } from '../../../../lib/ui/tokens';

export default function ClassDetail() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const sb = getSupabaseClient();
  const [delStep, setDelStep] = useState<0 | 1 | 2>(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
  const delPlan = classDeleteConfirmPlan(activities.map((a) => a.status));

  return (
    <ScreenScaffold scroll>
      <View style={{ marginBottom: space[2] }}>
        <Button title="← 班級列表" variant="ghost" onPress={() => router.back()} />
      </View>
      <Text variant="h1">{className}</Text>
      {msg ? <Text color="warm" style={{ marginTop: space[2] }}>{msg}</Text> : null}

      <Card style={{ marginTop: space[3], alignItems: 'center' }}>
        <Text color="muted">班級代碼（學生加入用，可長按選取）</Text>
        <Text variant="h1" selectable>{classCode}</Text>
      </Card>

      <View style={{ marginTop: space[3] }}>
        <RosterTable roster={roster} />
      </View>

      <SectionHeader title="活動" />
      <View style={{ marginTop: space[2] }}>
        <Button title="＋ 開新活動" onPress={() => router.push(`/console/class/${classId}/new`)} />
      </View>
      {activities.length === 0 ? (
        <EmptyState illustration={illustrations.empty.noActivity} title="尚無活動" body="建立一輪領地佔領活動。" />
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

      <View style={{ marginTop: space[6] }}>
        <Button
          title="刪除班級"
          variant="destructive"
          onPress={() => setDelStep(delPlan.tier === 'double' ? 1 : 2)}
        />
      </View>

      <DialogPrompt
        visible={delStep === 1}
        title="班級尚有未結束的活動"
        body={delPlan.firstWarning ?? ''}
        confirmLabel="仍要刪除"
        onConfirm={() => setDelStep(2)}
        onCancel={() => setDelStep(0)}
        destructive
      />
      <DialogPrompt
        visible={delStep === 2}
        title={delPlan.finalTitle}
        body={delPlan.finalBody}
        confirmLabel={busy ? '刪除中…' : '永久刪除'}
        onConfirm={async () => {
          setBusy(true);
          try {
            await deleteClass(sb, classId);
            router.back();
          } catch (e) {
            setDelStep(0);
            setMsg(mapError(e).message);
          } finally {
            setBusy(false);
          }
        }}
        onCancel={() => setDelStep(0)}
        destructive
      />
    </ScreenScaffold>
  );
}
