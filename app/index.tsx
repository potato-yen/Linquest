// app/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useSession } from '../lib/ui/session/useSession';
import { color } from '../lib/ui/tokens';

export default function Index() {
  const session = useSession();

  if (session.status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg.base, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={color.brand.primary} />
      </View>
    );
  }

  if (session.status === 'unauth') return <Redirect href="/(auth)/sign-in" />;
  return <Redirect href="/(app)/home" />;
}
