// app/(app)/me/index.tsx
import React from 'react';
import { ScreenScaffold, Text, Button, Card } from '../../../lib/ui/components';
import { useSession } from '../../../lib/ui/session/useSession';

export default function Me() {
  const s = useSession();
  if (s.status !== 'auth') return null;
  return (
    <ScreenScaffold scroll>
      <Text variant="h1">{s.user.display_name ?? '我'}</Text>
      <Card><Text color="muted">{s.user.email}</Text></Card>
      <Card><Text color="muted">身份：{s.user.role === 'student' ? '學生' : '教師'}</Text></Card>
      <Button title="登出" variant="destructive" onPress={() => s.signOut()} />
    </ScreenScaffold>
  );
}
