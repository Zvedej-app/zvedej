import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { ageOn, consentAge, MIN_AGE, parseBirthDate } from '../lib/age';
import type { Country } from '../lib/types';
import { useSettings } from '../providers/SettingsProvider';
import { T } from './ui';

/** Pod datem narození: upozorní, že bude potřeba souhlas rodiče (nebo že registrace není možná). */
export function ParentNote({ day, month, year, country }: { day: string; month: string; year: string; country: Country }) {
  const { t, colors } = useSettings();
  const iso = parseBirthDate(day, month, year);
  if (!iso) return null;
  const age = ageOn(iso, new Date());
  if (age >= consentAge(country)) return null;
  const blocked = age < MIN_AGE;
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 2 }}>
      <Ionicons
        name={blocked ? 'close-circle' : 'people'}
        size={16}
        color={blocked ? colors.danger : colors.primary}
        style={{ marginTop: 2 }}
      />
      <T v="caption" color={blocked ? colors.danger : colors.text} style={{ flex: 1 }}>
        {blocked ? t('auth.underAge') : t('parent.needed', { age: consentAge(country) })}
      </T>
    </View>
  );
}
