import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { LOCALES, translate, type Lang, type TKey } from '../lib/i18n';
import { darkPalette, lightPalette, type Palette } from '../lib/theme';
import { setDecimalSeparator, type Unit } from '../lib/units';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeMode;
  lang: Lang;
  unit: Unit;
  barKg: number;
  roundingKg: number;
  restSec: number;
  haptics: boolean;
  autoplay: boolean;
  muted: boolean;
}

const KEY = 'zvedej:settings:v1';

function deviceLang(): Lang {
  const code = getLocales()[0]?.languageCode ?? 'cs';
  return code === 'sk' ? 'sk' : code === 'en' ? 'en' : 'cs';
}

const DEFAULTS: Settings = {
  theme: 'system',
  lang: 'cs',
  unit: 'kg',
  barKg: 20,
  roundingKg: 1,
  restSec: 120,
  haptics: true,
  autoplay: true,
  muted: false,
};

interface Ctx {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  locale: string;
  colors: Palette;
  isDark: boolean;
  tap: (kind?: 'light' | 'medium' | 'success') => void;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULTS, lang: deviceLang() });
  const [ready, setReady] = useState(false);
  const scheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSettings((s) => ({ ...s, ...JSON.parse(raw) }));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  setDecimalSeparator(settings.lang === 'en' ? '.' : ',');
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && scheme === 'dark');

  const value = useMemo<Ctx>(
    () => ({
      settings,
      ready,
      update,
      t: (key, vars) => translate(settings.lang, key, vars),
      locale: LOCALES[settings.lang],
      colors: isDark ? darkPalette : lightPalette,
      isDark,
      tap: (kind = 'light') => {
        if (!settings.haptics || Platform.OS === 'web') return;
        if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        else
          Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(
            () => {},
          );
      },
    }),
    [settings, ready, update, isDark],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const c = useContext(SettingsContext);
  if (!c) throw new Error('useSettings outside provider');
  return c;
}
