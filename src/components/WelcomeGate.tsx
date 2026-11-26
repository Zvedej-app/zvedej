import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useTraining } from '../providers/TrainingProvider';

export const welcomeKey = (userId: string) => `zvedej:welcomeSeen:${userId}`;

/** Novému uživateli (bez tréninků a plánů) jednou ukáže úvodního průvodce. */
export function WelcomeGate() {
  const { session } = useAuth();
  const { ready, data } = useTraining();
  const checked = useRef<string | null>(null);
  const userId = session?.userId ?? null;

  useEffect(() => {
    if (!userId || !ready || checked.current === userId) return;
    checked.current = userId;
    const key = welcomeKey(userId);
    AsyncStorage.getItem(key)
      .then((seen) => {
        if (seen) return;
        if (data.logs.length > 0 || data.plans.length > 0) {
          // stávající uživatel – průvodce nepotřebuje
          AsyncStorage.setItem(key, '1').catch(() => {});
          return;
        }
        setTimeout(() => router.push('/welcome'), 300);
      })
      .catch(() => {});
  }, [userId, ready, data.logs.length, data.plans.length]);
  return null;
}
