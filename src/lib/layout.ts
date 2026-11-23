import { Platform, useWindowDimensions } from 'react-native';

/** šířka okna, od které se web zobrazuje v rozložení pro počítač */
export const DESKTOP_MIN_WIDTH = 900;
/** šířka postranního panelu s navigací na počítači */
export const SIDEBAR_WIDTH = 244;
/** maximální šířka obsahu běžné obrazovky na počítači */
export const CONTENT_MAX = 760;
/** maximální šířka široké obrazovky (např. Svaz ve dvou sloupcích) */
export const CONTENT_WIDE_MAX = 1180;

/**
 * Rozložení pro počítač: jen webová verze v širokém okně.
 * Na telefonu (nativní aplikace i web v mobilu) vždy false, takže se tam nic nemění.
 */
export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_MIN_WIDTH;
}
