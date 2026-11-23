import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import { CLUB_LOGOS, CLUB_LOGOS_DARK_INK } from '../data/clubLogos';
import type { Club } from '../lib/types';
import { useSettings } from '../providers/SettingsProvider';
import { T } from './ui';

/** Ikona klubu: jeho logo (src/data/clubLogos.ts nebo URL z dat), jinak iniciály klubu. */
export function ClubBadge({
  club,
  size = 28,
}: {
  club: (Pick<Club, 'name' | 'logo'> & { id?: number }) | null | undefined;
  size?: number;
}) {
  const { colors, isDark } = useSettings();
  if (!club) return null;
  const local = club.id != null ? CLUB_LOGOS[club.id] : undefined;
  if (local || club.logo) {
    const img = (
      <Image
        source={local ?? { uri: club.logo! }}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel={club.name}
      />
    );
    // logo s tmavou kresbou by v tmavém režimu zaniklo – podložíme ho světlým kruhem
    if (isDark && club.id != null && CLUB_LOGOS_DARK_INK.has(club.id)) {
      const pad = Math.round(size * 0.12);
      return (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#F4F6F9',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={local ?? { uri: club.logo! }}
            style={{ width: size - pad * 2, height: size - pad * 2 }}
            contentFit="contain"
            accessibilityLabel={club.name}
          />
        </View>
      );
    }
    return img;
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
