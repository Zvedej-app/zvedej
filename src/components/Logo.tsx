import { Image } from 'expo-image';
import React from 'react';
import Svg, { Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * Činka: od středu směrem ven největší kotouč → menší kotouče → uzávěr (zámek) → konec osy.
 * Jedna definice slouží pro logo, ikonu i úvodní obrazovku.
 */
function Barbell({ color, accent }: { color: string; accent: string }) {
  return (
    <G>
      {/* osa */}
      <Rect x="4" y="46" width="192" height="8" rx="4" fill={color} />
      {/* levá strana (od středu): velký → střední → malý kotouč → uzávěr */}
      <Rect x="62" y="12" width="14" height="76" rx="4" fill={color} />
      <Rect x="48" y="24" width="12" height="52" rx="3.5" fill={accent} />
      <Rect x="38" y="34" width="8" height="32" rx="3" fill={color} />
      <Rect x="29" y="40" width="7" height="20" rx="2" fill={accent} />
      {/* pravá strana */}
      <Rect x="124" y="12" width="14" height="76" rx="4" fill={color} />
      <Rect x="140" y="24" width="12" height="52" rx="3.5" fill={accent} />
      <Rect x="154" y="34" width="8" height="32" rx="3" fill={color} />
      <Rect x="164" y="40" width="7" height="20" rx="2" fill={accent} />
      {/* úchop uprostřed */}
      <Rect x="84" y="44" width="32" height="12" rx="3" fill={accent} opacity={0.9} />
    </G>
  );
}

/** Logo aplikace Zvedej – činka */
export function BarbellLogo({ size = 120, color = '#FFFFFF', accent = '#A9BFDC' }: { size?: number; color?: string; accent?: string }) {
  return (
    <Svg width={size} height={size * 0.5} viewBox="0 0 200 100">
      <Barbell color={color} accent={accent} />
    </Svg>
  );
}

/** Ikona aplikace – činka v modrém čtverci */
export function AppIcon({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1E5AA8" />
          <Stop offset="1" stopColor="#09264A" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" rx="24" fill="url(#g)" />
      <G transform="translate(10 30) scale(0.4)">
        <Barbell color="#FFFFFF" accent="#D7141A" />
      </G>
    </Svg>
  );
}

const LION = require('../../assets/images/csv-lion.png');
/** poměr stran loga (šířka / výška) */
export const LION_RATIO = 378 / 306;

/** Logo Českého svazu vzpírání – lev s činkou (bez nápisu ČSV a „zal. 1893“). */
export function LionLogo({ height = 40, opacity = 1 }: { height?: number; opacity?: number }) {
  return (
    <Image
      source={LION}
      style={{ height, width: height * LION_RATIO, opacity }}
      contentFit="contain"
      accessibilityLabel="Český svaz vzpírání"
    />
  );
}
