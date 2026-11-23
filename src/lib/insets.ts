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

/** iPhone s tlačítkem Domů (SE, 8 a starší) – úzká obrazovka 16:9, bez čárky Domů dole */
function hasHomeButton() {
  if (typeof window === 'undefined' || !window.screen) return false;
  const { width, height } = window.screen;
  const ratio = Math.max(width, height) / Math.min(width, height);
  return ratio < 1.9;
}

/**
 * Spodní odsazení obsahu nad okrajem displeje.
 * Aplikace přidaná na plochu iPhonu (PWA) dostává od iOS zbytečně velký spodní okraj,
 * takže by spodní lišta „visela“ nad okrajem a celá aplikace působila posunutá nahoru.
 * Na webu proto: iPhone s tlačítkem Domů žádný okraj, iPhone s gestem jen místo pro čárku Domů.
 */
export function useBottomInset() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'web') return insets.bottom;
  if (insets.bottom <= 0 || hasHomeButton()) return 0;
  return Math.round(Math.min(insets.bottom, 34) * 0.6);
}
