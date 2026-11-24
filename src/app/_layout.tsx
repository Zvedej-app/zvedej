import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useCallback, useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { DialogHost } from '../components/DialogHost';
import { ModerationNotices } from '../components/safety/ModerationNotices';
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
  // písmo Plus Jakarta Sans; když se nenačte (např. offline), aplikace pokračuje se systémovým písmem
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const allReady = ready && auth.ready && (fontsLoaded || !!fontError);

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
            <Stack.Screen name="blocked" />
            <Stack.Screen name="moderation" />
            <Stack.Screen name="coaches" />
            <Stack.Screen name="progress" />
            <Stack.Screen name="account" options={{ presentation: 'modal' }} />
            <Stack.Screen name="set-password" options={{ presentation: 'modal' }} />
            <Stack.Screen name="join/[id]" />
            <Stack.Screen name="team/index" />
            <Stack.Screen name="team/invite" />
            <Stack.Screen name="team/[id]" />
            <Stack.Screen name="team/log" />
            <Stack.Screen name="team/group/[id]" />
            <Stack.Screen name="team/assign/[planId]" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="auth" />
          </Stack.Protected>
          {/* právní texty jsou dostupné i bez přihlášení (odkaz z registrace) */}
          <Stack.Screen name="legal/[doc]" />
        </Stack>
      )}
      <DialogHost />
      {allReady && splashDone && <ModerationNotices />}
      <RestNotificationBridge />
      {!splashDone && <AnimatedSplash ready={allReady} onDone={done} />}
    </>
  );
}
