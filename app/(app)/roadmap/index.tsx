// app/(app)/roadmap/index.tsx
import React from 'react';
import { ScreenScaffold, Text } from '../../../lib/ui/components';

export default function RoadmapTab() {
  return (
    <ScreenScaffold>
      <Text variant="h1">關卡進度</Text>
      <Text color="muted">Phase 1 將填上山徑與 stage 答題。</Text>
    </ScreenScaffold>
  );
}
