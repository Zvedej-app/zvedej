import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSettings } from '../providers/SettingsProvider';
import { Button, Header, IconButton, Screen, T } from './ui';

/** Obrazovka pro hosta místo funkce, která potřebuje účet (zprávy, nahrání videa…). */
export function GuestGate({ title }: { title?: string }) {
  const { t, colors } = useSettings();
  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={title ?? ''}
      />
      <View style={{ flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="person-add" size={34} color={colors.primary} />
        </View>
        <T v="h2" style={{ textAlign: 'center' }}>
          {t('guest.needAccountTitle')}
        </T>
        <T muted style={{ textAlign: 'center' }}>
          {t('guest.needAccount')}
        </T>
        <Button
          icon="person-add-outline"
          title={t('guest.createAccount')}
          onPress={() => router.push('/account')}
          style={{ alignSelf: 'stretch' }}
        />
      </View>
    </Screen>
  );
}
