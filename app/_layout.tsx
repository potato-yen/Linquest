// app/_layout.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { CormorantGaramond_500Medium, CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { View, ActivityIndicator } from 'react-native';
import { SessionProvider } from '../lib/ui/session/SessionContext';
import { color } from '../lib/ui/tokens';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg.base, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={color.brand.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg.base } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="battle/[battleId]" options={{ presentation: 'modal' }} />
          </Stack>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
