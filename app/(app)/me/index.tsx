// app/(app)/me/index.tsx
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ScreenScaffold, Text, Button, Card, ListRow } from '../../../lib/ui/components';
import { useSession } from '../../../lib/ui/session/useSession';
import { space } from '../../../lib/ui/tokens';

export default function Me() {
  const s = useSession();
  if (s.status !== 'auth') return null;
  return (
    <ScreenScaffold scroll>
      <Text variant="h1">{s.user.display_name ?? '我'}</Text>
      <Card><Text color="muted">{s.user.email}</Text></Card>
      <Card><Text color="muted">身份：{s.user.role === 'student' ? '學生' : '教師'}</Text></Card>
      <View style={{ gap: space[2] }}>
        <ListRow title="加入班級" subtitle="輸入老師提供的 6 位代碼" onPress={() => router.push('/(app)/territory/join')} />
        <ListRow title="我的班級" subtitle="查看已加入的所有班級" onPress={() => router.push('/(app)/me/classes')} />
      </View>
      <Button title="登出" variant="destructive" onPress={() => s.signOut()} />
    </ScreenScaffold>
  );
}
