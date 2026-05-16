// app/(app)/roadmap/_layout.tsx
// Nested Stack so the whole roadmap subtree (index + stage/[stage] +
// stage/[stage]/result) collapses into ONE tab in the parent <Tabs>.
// Without this layout Expo Router registers every nested route file as
// its own tab button.
import React from 'react';
import { Stack } from 'expo-router';

export default function RoadmapStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
