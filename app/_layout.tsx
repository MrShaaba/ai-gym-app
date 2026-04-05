import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { colors } from '@/config/theme';
import { useSession } from '@/hooks/useSession';

export default function RootLayout() {
  useSession();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(client)" />
        <Stack.Screen name="(trainer)" />
        <Stack.Screen name="(workout)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(shared)" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
