import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from './ui';

/**
 * Drobný řádek s rozměry displeje (jen web). Slouží k ladění zobrazení aplikace
 * na ploše iPhonu – screenshot tohoto řádku řekne, co iOS stránce hlásí.
 */
export function ScreenDiagnostics() {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState('');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const read = () => {
      const w = window;
      const nav = w.navigator as Navigator & { standalone?: boolean };
      const root = document.getElementById('root')?.getBoundingClientRect();
      setInfo(
        [
          `scr ${w.screen.width}×${w.screen.height}`,
          `win ${w.innerWidth}×${w.innerHeight}`,
          `vv ${Math.round(w.visualViewport?.height ?? 0)}/${Math.round(w.visualViewport?.offsetTop ?? 0)}`,
          `doc ${document.documentElement.clientHeight}`,
          `root ${Math.round(root?.top ?? 0)}–${Math.round(root?.bottom ?? 0)}`,
          `sy ${Math.round(w.scrollY)}`,
          `pwa ${nav.standalone ? 1 : 0}${w.matchMedia?.('(display-mode: standalone)').matches ? 's' : ''}`,
        ].join(' · '),
      );
    };
    read();
    const id = setInterval(read, 1000);
    return () => clearInterval(id);
  }, []);
  if (Platform.OS !== 'web') return null;
  return (
    <T v="caption" muted style={{ textAlign: 'center', opacity: 0.6 }}>
      {info} · in {Math.round(insets.top)}/{Math.round(insets.bottom)}
    </T>
  );
}
