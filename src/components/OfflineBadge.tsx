import { Ionicons } from '@expo/vector-icons';
import { useNetworkState } from 'expo-network';
import React from 'react';
import { View } from 'react-native';
import { api } from '../lib/api';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';
import { T } from './ui';

/**
 * Bez signálu (typicky v posilovně): ukáže, že se trénink ukládá do telefonu
 * a odešle se po připojení. Po připojení a odeslání zmizí.
 */
export function OfflineBadge({ compact }: { compact?: boolean }) {
  const { t, colors } = useSettings();
  const net = useNetworkState();
  const { syncState } = useTraining();
  const offline = net.isConnected === false || net.isInternetReachable === false;
  if (!offline) return null;
  const pending = api.mode === 'supabase' && syncState === 'pending';
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.surfaceAlt,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: compact ? 6 : 9,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={compact ? 16 : 18} color={colors.textMuted} />
      <T v={compact ? 'caption' : 'small'} muted style={{ flex: 1 }}>
        {pending ? t('off.pending') : t('off.saved')}
      </T>
    </View>
  );
}
