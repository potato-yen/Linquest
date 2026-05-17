// app/(app)/_layout.tsx
import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSession } from '../../lib/ui/session/useSession';
import { color } from '../../lib/ui/tokens';
import { BattleInviteRoot } from '../../lib/ui/composites/BattleInviteRoot';

export default function AppLayout() {
  const session = useSession();
  if (session.status === 'loading') return null;
  if (session.status === 'unauth') return <Redirect href="/(auth)/sign-in" />;

  const isTeacher = session.user.role === 'teacher';

  const screenOptions = {
    headerShown: false,
    tabBarStyle: { backgroundColor: color.bg.surface, borderTopColor: color.bg.sunken },
    tabBarActiveTintColor: color.brand.primary,
    tabBarInactiveTintColor: color.text.muted,
    tabBarLabelStyle: { fontSize: 10, letterSpacing: 0.05 },
  };

  if (isTeacher) {
    return (
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen name="console" options={{ title: 'Console', tabBarIcon: ({ color: c }) => <Feather name="grid" size={20} color={c} /> }} />
        <Tabs.Screen name="me/index" options={{ title: 'Me', tabBarIcon: ({ color: c }) => <Feather name="user" size={20} color={c} /> }} />
        <Tabs.Screen name="home/index" options={{ href: null }} />
        <Tabs.Screen name="roadmap" options={{ href: null }} />
        <Tabs.Screen name="territory/index" options={{ href: null }} />
        <Tabs.Screen name="territory/join" options={{ href: null }} />
        <Tabs.Screen name="territory/[activityId]" options={{ href: null }} />
        <Tabs.Screen name="me/classes" options={{ href: null }} />
      </Tabs>
    );
  }

  return (
    <>
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen name="home/index" options={{ title: 'Home', tabBarIcon: ({ color: c }) => <Feather name="home" size={20} color={c} /> }} />
        <Tabs.Screen name="roadmap" options={{ title: 'Roadmap', tabBarIcon: ({ color: c }) => <Feather name="map" size={20} color={c} /> }} />
        <Tabs.Screen name="territory/index" options={{ title: 'Territory', tabBarIcon: ({ color: c }) => <Feather name="hexagon" size={20} color={c} /> }} />
        <Tabs.Screen name="me/index" options={{ title: 'Me', tabBarIcon: ({ color: c }) => <Feather name="user" size={20} color={c} /> }} />
        <Tabs.Screen name="me/classes" options={{ href: null }} />
        <Tabs.Screen name="territory/join" options={{ href: null }} />
        <Tabs.Screen name="territory/[activityId]" options={{ href: null }} />
        <Tabs.Screen name="console" options={{ href: null }} />
      </Tabs>
      <BattleInviteRoot />
    </>
  );
}
