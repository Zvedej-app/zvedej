import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Aplikace nainstalovaná na plochu iPhonu (PWA) – bez lišty Safari. */
export function isStandalone() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/**
 * Horní odsazení obsahu pod výřez / stavový řádek.
 * Na iPhonech s výřezem (X a novější) zajistí, že nadpis není schovaný pod stavovým řádkem
 * (na webu se k odsazení z `env(safe-area-inset-top)` přidá malá rezerva).
 */
export function useTopInset() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'web') return insets.top;
  if (insets.top === 0) return 0; // desktop / prohlížeč bez výřezu
  return insets.top + (isStandalone() ? 6 : 14);
}

export function useBottomInset() {
  const insets = useSafeAreaInsets();
  return insets.bottom;
}
