// app/(app)/home/index.tsx
import React from 'react';
import { ScreenScaffold, Text } from '../../../lib/ui/components';
import { useSession } from '../../../lib/ui/session/useSession';

export default function Home() {
  const s = useSession();
  const name = s.status === 'auth' ? s.user.display_name ?? s.user.email : '';
  return (
    <ScreenScaffold>
      <Text variant="h1">早安，{name}</Text>
      <Text color="muted">Phase 1 將在這裡填上今日任務、對戰戰況、roadmap 進度。</Text>
    </ScreenScaffold>
  );
}
