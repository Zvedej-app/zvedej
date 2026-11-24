import { Image } from 'expo-image';
import React from 'react';
import Svg, { Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';

export const PLATE_RED = '#D4060D';
export const PLATE_BLUE = '#1E5AA8';

/**
 * Jedna strana činky podle závodní osy: od kraje konec osy, bílý kotouč 0,5 kg, uzávěr,
 * modrý kotouč a dva červené kotouče (velké kotouče jsou stejně vysoké), pak osa ke středu.
 * Kreslí se v souřadnicích 0–120 × 0–120 (levá strana; pravá se zrcadlí).
 */
function BarbellEnd({ bar = '#FFFFFF' }: { bar?: string }) {
  const stroke = 'rgba(255,255,255,0.55)';
  return (
    <G>
      {/* konec osy */}
      <Rect x="0" y="55" width="12" height="10" rx="2" fill={bar} />
      {/* bílý kotouč 0,5 kg */}
      <Rect x="10" y="43" width="7" height="34" rx="2" fill="#FFFFFF" stroke="#C9D2DE" strokeWidth="1" />
      {/* uzávěr */}
      <Rect x="19" y="47" width="11" height="26" rx="3" fill="#DDE3EA" stroke="#8E99A8" strokeWidth="1.5" />
      <Rect x="23" y="51" width="3" height="3" rx="1.5" fill="#5D6878" />
      {/* modrý a dva červené kotouče – stejně velké */}
      <Rect x="32" y="5" width="14" height="110" rx="4" fill={PLATE_BLUE} stroke={stroke} strokeWidth="1" />
      <Rect x="48" y="5" width="14" height="110" rx="4" fill={PLATE_RED} stroke={stroke} strokeWidth="1" />
      <Rect x="64" y="5" width="14" height="110" rx="4" fill={PLATE_RED} stroke={stroke} strokeWidth="1" />
      {/* vnitřní dorazová objímka a osa ke středu */}
      <Rect x="78" y="50" width="6" height="20" rx="2" fill="#DDE3EA" />
      <Rect x="84" y="56" width="36" height="8" rx="3" fill={bar} />
    </G>
  );
}

/** Polovina činky (levá, nebo zrcadlená pravá) – na úvodní obrazovce s nápisem uprostřed. */
export function BarbellHalf({ height = 110, flip = false }: { height?: number; flip?: boolean }) {
  return (
    <Svg width={height} height={height} viewBox="0 0 120 120">
      <G transform={flip ? 'translate(120 0) scale(-1 1)' : undefined}>
        <BarbellEnd />
      </G>
    </Svg>
  );
}

/** Logo aplikace Zvedej – celá činka */
export function BarbellLogo({ size = 120 }: { size?: number; color?: string; accent?: string }) {
  return (
    <Svg width={size} height={size * 0.4} viewBox="0 0 300 120">
      <BarbellEnd />
      <Rect x="118" y="56" width="64" height="8" rx="3" fill="#FFFFFF" />
      <G transform="translate(300 0) scale(-1 1)">
        <BarbellEnd />
      </G>
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
      <G transform="translate(5 32) scale(0.3)">
        <BarbellEnd />
        <Rect x="118" y="56" width="64" height="8" rx="3" fill="#FFFFFF" />
        <G transform="translate(300 0) scale(-1 1)">
          <BarbellEnd />
        </G>
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
