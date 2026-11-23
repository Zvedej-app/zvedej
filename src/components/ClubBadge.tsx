import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import type { Club } from '../lib/types';
import { useSettings } from '../providers/SettingsProvider';
import { T } from './ui';

/** Ikona klubu: logo, pokud ho svaz uvádí, jinak iniciály klubu. */
export function ClubBadge({ club, size = 28 }: { club: Pick<Club, 'name' | 'logo'> | null | undefined; size?: number }) {
  const { colors } = useSettings();
  if (!club) return null;
  if (club.logo) {
    return <Image source={{ uri: club.logo }} style={{ width: size, height: size, borderRadius: size / 4 }} contentFit="contain" />;
  }
  const initials = club.name
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^(TJ|SK|SKV|ASK|KS|PSK|CSSK)$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <T color="#FFF" style={{ fontWeight: '800', fontSize: size * 0.4 }}>
        {initials || club.name[0]}
      </T>
    </View>
  );
}
