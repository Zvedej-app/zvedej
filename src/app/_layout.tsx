import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { DialogHost } from '../components/DialogHost';
import { RestNotificationBridge } from '../components/RestNotificationBridge';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { SettingsProvider, useSettings } from '../providers/SettingsProvider';
import { TrainingProvider } from '../providers/TrainingProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <TrainingProvider>
            <App />
          </TrainingProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function App() {
  const { ready, colors, isDark } = useSettings();
  const auth = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const allReady = ready && auth.ready;

  useEffect(() => {
    // nativní splash nahradí animovaná úvodní obrazovka
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});
  }, [colors.bg]);

  const done = useCallback(() => setSplashDone(true), []);
  const signedIn = !!auth.session;

  return (
    <>
      <StatusBar style={!splashDone || isDark ? 'light' : 'dark'} />
      {allReady && (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="profile-edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="upload" options={{ presentation: 'modal' }} />
            <Stack.Screen name="plan/[id]" />
            <Stack.Screen name="plans" />
            <Stack.Screen name="friends" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="chat/[id]" />
            <Stack.Screen name="workout" options={{ gestureEnabled: false }} />
            <Stack.Screen name="log/[id]" />
            <Stack.Screen name="user/[id]" />
            <Stack.Screen name="club/[id]" />
            <Stack.Screen name="videos" options={{ animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="auth" />
          </Stack.Protected>
        </Stack>
      )}
      <DialogHost />
      <RestNotificationBridge />
      {!splashDone && <AnimatedSplash ready={allReady} onDone={done} />}
    </>
  );
}
