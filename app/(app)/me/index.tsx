// app/(app)/me/index.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ScreenScaffold, Text, Button, Card, ListRow, EmptyState, PromptDialog } from '../../../lib/ui/components';
import { illustrations } from '../../../lib/ui/illustrations';
import { useSession } from '../../../lib/ui/session/useSession';
import { getSupabaseClient } from '../../../lib/supabase';
import { updateDisplayName } from '../../../lib/auth/service';
import { mapError } from '../../../lib/ui/error/mapError';
import { space } from '../../../lib/ui/tokens';

export default function Me() {
  const s = useSession();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (s.status !== 'auth') return null;
  const isTeacher = s.user.role !== 'student';
  const currentName = s.user.display_name ?? '';

  async function onSave(newName: string) {
    setBusy(true); setErr(null);
    try {
      await updateDisplayName(getSupabaseClient(), newName);
      await s.refreshUser();
      setEditing(false);
    } catch (e) {
      setErr(mapError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenScaffold scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="h1">{s.user.display_name ?? '我'}</Text>
        <Button title="編輯" variant="ghost" onPress={() => { setErr(null); setEditing(true); }} />
      </View>
      <Card><Text color="muted">{s.user.email}</Text></Card>
      <Card><Text color="muted">身份：{isTeacher ? '教師' : '學生'}</Text></Card>
      {isTeacher ? (
        <EmptyState
          illustration={illustrations.empty.startHere}
          title="教師後台"
          body="課堂管理、活動發布與數據分析，請從下方的「概況」分頁進入。"
        />
      ) : (
        <View style={{ gap: space[2] }}>
          <ListRow title="加入班級" subtitle="輸入老師提供的 6 位代碼" onPress={() => router.push('/(app)/territory/join')} />
          <ListRow title="我的班級" subtitle="查看已加入的所有班級" onPress={() => router.push('/(app)/me/classes')} />
        </View>
      )}
      <Button title="登出" variant="destructive" onPress={() => s.signOut()} />

      <PromptDialog
        visible={editing}
        title="修改顯示名稱"
        label="顯示名稱"
        initialValue={currentName}
        busy={busy}
        error={err}
        onConfirm={onSave}
        onCancel={() => { if (!busy) setEditing(false); }}
      />
    </ScreenScaffold>
  );
}
