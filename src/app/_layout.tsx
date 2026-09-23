import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SleepProvider } from '../state/sleep';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SleepProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F4EFE6' },
          }}
        />
      </SleepProvider>
    </SafeAreaProvider>
  );
}
