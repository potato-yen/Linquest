// app/(auth)/_layout.tsx
import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useSession } from '../../lib/ui/session/useSession';

export default function AuthLayout() {
  const session = useSession();
  if (session.status === 'auth') {
    return <Redirect href={session.user.role === 'teacher' ? '/(app)/console' : '/(app)/home'} />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
