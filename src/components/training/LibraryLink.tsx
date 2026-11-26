import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSettings } from '../../providers/SettingsProvider';
import { PressScale, T } from '../ui';

/** Odkaz na knihovnu hotových plánů. */
export function LibraryLink() {
  const { t, colors } = useSettings();
  return (
    <PressScale
      onPress={() => router.push('/plan-library')}
      scaleTo={0.98}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 18,
        backgroundColor: colors.primarySoft,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="library" size={20} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        <T v="h3" color={colors.primary}>
          {t('lib.open')}
        </T>
        <T v="caption" muted>
          {t('lib.openSub')}
        </T>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
    </PressScale>
  );
}
