// app/(app)/territory/index.tsx
import React from 'react';
import { ScreenScaffold, Text } from '../../../lib/ui/components';

export default function TerritoryTab() {
  return (
    <ScreenScaffold>
      <Text variant="h1">領地戰</Text>
      <Text color="muted">Phase 2 將填上 activity 列表與地圖。</Text>
    </ScreenScaffold>
  );
}
