import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Banner, Button, Field, Header, IconButton, Row, Screen, T } from '../components/ui';
import { api } from '../lib/api';
import { ageOn, MIN_AGE, parseBirthDate } from '../lib/age';
import { notify } from '../lib/dialog';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';

/** Host si vytvoří účet – tréninky, plány i maxima zůstanou. */
export default function AccountScreen() {
  const { t, colors } = useSettings();
  const { refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bDay, setBDay] = useState('');
  const [bMonth, setBMonth] = useState('');
  const [bYear, setBYear] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const birthDate = parseBirthDate(bDay, bMonth, bYear);
    if (!firstName.trim() || !lastName.trim()) return notify(t('auth.nameRequired'));
    if (!birthDate) return notify(t('auth.birthInvalid'));
    if (ageOn(birthDate, new Date()) < MIN_AGE) return notify(t('auth.underAge'));
    if (!email.includes('@')) return notify(t('auth.invalid'));
    if (!consent) return notify(t('auth.consentRequired'));
    setBusy(true);
    try {
      const r = await api.upgradeGuest({ email, firstName, lastName, birthDate });
      await refreshProfile();
      if (r.needsConfirmation) setSent(true);
      else router.replace('/set-password');
    } catch (e) {
      const m = String((e as Error)?.message ?? '');
      notify(
        m.includes('UNDER_AGE')
          ? t('auth.underAge')
          : m.toLowerCase().includes('already')
            ? t('guest.emailTaken')
            : m || t('common.error'),
      );
    } finally {
      setBusy(false);
    }
  };

  const num = (value: string, set: (v: string) => void, ph: string, max: number, flex: number) => (
    <Field
      value={value}
      onChangeText={(v) => set(v.replace(/\D/g, '').slice(0, max))}
      placeholder={ph}
      keyboardType="number-pad"
      maxLength={max}
      style={{ flex }}
      inputStyle={{ textAlign: 'center' }}
    />
  );

  return (
    <Screen>
      <Header
        left={<IconButton name="close" onPress={() => router.back()} label={t('common.back')} />}
        title={t('guest.createAccount')}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {sent ? (
          <View style={{ padding: 28, gap: 14, alignItems: 'center' }}>
            <Ionicons name="mail-open-outline" size={56} color={colors.primary} />
            <T v="h2" style={{ textAlign: 'center' }}>
              {t('guest.checkEmailTitle')}
            </T>
            <T muted style={{ textAlign: 'center' }}>
              {t('guest.checkEmail', { email })}
            </T>
            <Button title={t('common.done')} onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Banner icon="cloud-done-outline" text={t('guest.keepData')} />
            <Row gap={10}>
              <Field
                label={t('auth.firstName')}
                value={firstName}
                onChangeText={setFirstName}
                style={{ flex: 1 }}
                autoComplete="given-name"
              />
              <Field
                label={t('auth.lastName')}
                value={lastName}
                onChangeText={setLastName}
                style={{ flex: 1 }}
                autoComplete="family-name"
              />
            </Row>
            <View style={{ gap: 6 }}>
              <T v="label" muted>
                {t('auth.birthDate')}
              </T>
              <Row gap={10}>
                {num(bDay, setBDay, t('auth.dd'), 2, 1)}
                {num(bMonth, setBMonth, t('auth.mm'), 2, 1)}
                {num(bYear, setBYear, t('auth.yyyy'), 4, 1.6)}
              </Row>
            </View>
            <Field
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              onPress={() => setConsent(!consent)}
              style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 4 }}
            >
              <Ionicons
                name={consent ? 'checkbox' : 'square-outline'}
                size={24}
                color={consent ? colors.primary : colors.textMuted}
              />
              <T v="small" style={{ flex: 1, lineHeight: 20 }}>
                {t('auth.consentPre')}
                <T v="small" color={colors.primary} style={{ fontWeight: '700' }} onPress={() => router.push('/legal/terms')}>
                  {t('auth.consentTerms')}
                </T>
                {t('auth.consentMid')}
                <T v="small" color={colors.primary} style={{ fontWeight: '700' }} onPress={() => router.push('/legal/privacy')}>
                  {t('auth.consentPrivacy')}
                </T>
                {t('auth.consentAge')}
              </T>
            </Pressable>
            <Button icon="person-add-outline" title={t('guest.createAccount')} onPress={submit} loading={busy} />
            <T v="caption" muted style={{ textAlign: 'center' }}>
              {t('guest.passwordLater')}
            </T>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
