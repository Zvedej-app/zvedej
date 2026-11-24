import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Card, Empty, Field, Header, Loading, Screen, T } from '../../components/ui';
import { OPERATOR } from '../../data/legal';
import { api } from '../../lib/api';
import { notify } from '../../lib/dialog';
import { useSettings } from '../../providers/SettingsProvider';

/** Stránka pro rodiče (bez přihlášení): přehled, co aplikace dělá, a potvrzení souhlasu. */
export default function ParentConsentScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t, colors } = useSettings();
  const [info, setInfo] = useState<{ childFirstName: string; birthYear: number | null; confirmed: boolean } | null | undefined>(
    undefined,
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isParent, setIsParent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .parentConsentInfo(token)
      .then(setInfo)
      .catch(() => setInfo(null));
  }, [token]);

  const confirm = async () => {
    if (name.trim().length < 3 || !email.includes('@')) return notify(t('parent.fillAll'));
    if (!isParent) return notify(t('parent.confirmParentRequired'));
    setBusy(true);
    try {
      if (await api.confirmParentConsent(token, name.trim(), email.trim())) setDone(true);
      else notify(t('parent.invalid'));
    } catch {
      notify(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title={t('parent.title')} />
      {info === undefined ? (
        <Loading />
      ) : !info ? (
        <Empty icon="alert-circle-outline" text={t('parent.invalid')} />
      ) : done || info.confirmed ? (
        <View style={{ padding: 24, alignItems: 'center', gap: 12 }}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <T v="h2" style={{ textAlign: 'center' }}>
            {t('parent.thanks')}
          </T>
          <T muted style={{ textAlign: 'center' }}>
            {t('parent.thanksText', { email: OPERATOR.email })}
          </T>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' }}
        >
          <T v="h2">{t('parent.pageHeadline', { name: info.childFirstName || '—' })}</T>
          <T muted>{t('parent.pageIntro')}</T>
          <Card style={{ gap: 8 }}>
            <T v="label" muted>
              {t('parent.whatWeProcess')}
            </T>
            <Point text={t('parent.p1')} />
            <Point text={t('parent.p2')} />
            <Point text={t('parent.p3')} />
            <Point text={t('parent.p4')} />
          </Card>
          <Card style={{ gap: 8 }}>
            <T v="label" muted>
              {t('parent.protections')}
            </T>
            <Point text={t('parent.s1')} />
            <Point text={t('parent.s2')} />
            <Point text={t('parent.s3')} />
          </Card>
          <Row2>
            <Button kind="ghost" small title={t('legal.privacy')} onPress={() => router.push('/legal/privacy')} />
            <Button kind="ghost" small title={t('legal.terms')} onPress={() => router.push('/legal/terms')} />
          </Row2>
          <Field label={t('parent.yourName')} value={name} onChangeText={setName} autoComplete="name" />
          <Field
            label={t('parent.yourEmail')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isParent }}
            onPress={() => setIsParent(!isParent)}
            style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}
          >
            <Ionicons
              name={isParent ? 'checkbox' : 'square-outline'}
              size={24}
              color={isParent ? colors.primary : colors.textMuted}
            />
            <T v="small" style={{ flex: 1, lineHeight: 20 }}>
              {t('parent.declaration', { name: info.childFirstName || '—' })}
            </T>
          </Pressable>
          <Button icon="checkmark" title={t('parent.agree')} onPress={confirm} loading={busy} />
          <T v="caption" muted style={{ textAlign: 'center' }}>
            {t('parent.revoke', { email: OPERATOR.email })}
          </T>
        </ScrollView>
      )}
    </Screen>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>{children}</View>;
}

function Point({ text }: { text: string }) {
  const { colors } = useSettings();
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />
      <T style={{ flex: 1 }}>{text}</T>
    </View>
  );
}
