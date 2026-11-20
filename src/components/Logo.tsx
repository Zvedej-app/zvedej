import React from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop, G, Path, Circle } from 'react-native-svg';

/** Logo aplikace Zvedej – činka */
export function BarbellLogo({
  size = 120,
  color = '#FFFFFF',
  accent = '#84A9FF',
}: {
  size?: number;
  color?: string;
  accent?: string;
}) {
  const w = size;
  const h = size * 0.5;
  return (
    <Svg width={w} height={h} viewBox="0 0 200 100">
      {/* osa */}
      <Rect x="6" y="46" width="188" height="8" rx="4" fill={color} />
      {/* levá strana */}
      <Rect x="22" y="14" width="16" height="72" rx="5" fill={color} />
      <Rect x="41" y="24" width="12" height="52" rx="4" fill={accent} />
      <Rect x="56" y="34" width="8" height="32" rx="3" fill={color} />
      {/* pravá strana */}
      <Rect x="162" y="14" width="16" height="72" rx="5" fill={color} />
      <Rect x="147" y="24" width="12" height="52" rx="4" fill={accent} />
      <Rect x="136" y="34" width="8" height="32" rx="3" fill={color} />
      {/* úchop */}
      <Rect x="84" y="44" width="32" height="12" rx="3" fill={accent} opacity={0.9} />
    </Svg>
  );
}

/** Ikona aplikace – činka v modrém čtverci */
export function AppIcon({ size = 96 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2160F0" />
          <Stop offset="1" stopColor="#0C2D7E" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" rx="24" fill="url(#g)" />
      <G transform="translate(10 30) scale(0.4)">
        <Rect x="6" y="46" width="188" height="8" rx="4" fill="#FFFFFF" />
        <Rect x="22" y="14" width="16" height="72" rx="5" fill="#FFFFFF" />
        <Rect x="41" y="24" width="12" height="52" rx="4" fill="#B5CCFF" />
        <Rect x="56" y="34" width="8" height="32" rx="3" fill="#FFFFFF" />
        <Rect x="162" y="14" width="16" height="72" rx="5" fill="#FFFFFF" />
        <Rect x="147" y="24" width="12" height="52" rx="4" fill="#B5CCFF" />
        <Rect x="136" y="34" width="8" height="32" rx="3" fill="#FFFFFF" />
        <Rect x="84" y="44" width="32" height="12" rx="3" fill="#B5CCFF" />
      </G>
    </Svg>
  );
}

/**
 * Lev – symbol sekce Českého svazu vzpírání.
 * Dočasná ilustrace: až dorazí oficiální logo ČSV, nahraďte tuto komponentu
 * obrázkem (např. <Image source={require('../../assets/images/csv-logo.png')} />).
 */
export function LionLogo({ size = 40, color = '#1249D1', bg = 'transparent' }: { size?: number; color?: string; bg?: string }) {
  const mane = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {bg !== 'transparent' && <Circle cx="50" cy="50" r="50" fill={bg} />}
      <G>
        {mane.map((deg) => (
          <Path key={deg} d="M50 6 L58 24 L42 24 Z" fill={color} transform={`rotate(${deg} 50 52)`} />
        ))}
        <Circle cx="50" cy="52" r="27" fill={color} />
        {/* uši */}
        <Circle cx="33" cy="33" r="6" fill={color} />
        <Circle cx="67" cy="33" r="6" fill={color} />
        {/* obličej */}
        <Circle cx="50" cy="55" r="19" fill={bg === 'transparent' ? '#FFFFFF' : bg} />
        <Circle cx="43" cy="50" r="2.6" fill={color} />
        <Circle cx="57" cy="50" r="2.6" fill={color} />
        <Path d="M45 57 L55 57 L50 63 Z" fill={color} />
        <Path d="M50 63 Q46 68 42 66 M50 63 Q54 68 58 66" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* koruna – český lev */}
        <Path d="M38 26 L42 17 L46 23 L50 14 L54 23 L58 17 L62 26 Z" fill={color} />
      </G>
    </Svg>
  );
}
