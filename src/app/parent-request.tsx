import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Platform, ScrollView, Share, View } from 'react-native';
import { Banner, Button, Card, Field, Header, IconButton, Row, Screen, T } from '../components/ui';
import { api } from '../lib/api';
import { notify, toast } from '../lib/dialog';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';

/** Dítě mladší než věková hranice požádá zákonného zástupce o souhlas (GDPR čl. 8). */
export default function ParentRequestScreen() {
  const { t, colors } = useSettings();
  const { profile, refreshProfile } = useAuth();
  const [email, setEmail] = useState(profile?.parentEmail ?? '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ link: string; emailed: boolean } | null>(null);

  const send = async () => {
    if (!email.includes('@')) return notify(t('auth.invalid'));
    setBusy(true);
    try {
      setResult(await api.requestParentConsent(email));
    } catch {
      notify(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  const share = async (link: string) => {
    try {
      if (Platform.OS === 'web' && !(navigator as Navigator & { share?: unknown }).share) {
        await Clipboard.setStringAsync(link);
        toast(t('coach.linkCopied'));
      } else await Share.share({ message: t('parent.shareText', { link }), url: link });
    } catch {}
  };

  if (!profile?.needsParentConsent)
    return (
      <Screen>
        <Header
          left={<IconButton name="close" onPress={() => router.back()} label={t('common.back')} />}
          title={t('parent.title')}
        />
        <View style={{ padding: 24, alignItems: 'center', gap: 12 }}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          <T v="h3" style={{ textAlign: 'center' }}>
            {t('parent.done')}
          </T>
        </View>
      </Screen>
    );

  return (
    <Screen>
      <Header
        left={<IconButton name="close" onPress={() => router.back()} label={t('common.back')} />}
        title={t('parent.title')}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <T v="h2">{t('parent.headline')}</T>
        <T muted>{t('parent.why')}</T>
        <Banner icon="lock-closed-outline" text={t('parent.untilThen')} />
        <Field
          label={t('parent.parentEmail')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Button icon="send" title={t('parent.send')} onPress={send} loading={busy} />
        {result && (
          <Card style={{ gap: 10 }}>
            <Row gap={8}>
              <Ionicons name={result.emailed ? 'mail' : 'link'} size={20} color={colors.primary} />
              <T style={{ flex: 1, fontWeight: '700' }}>
                {result.emailed ? t('parent.emailed', { email }) : t('parent.shareLink')}
              </T>
            </Row>
            <T v="small" muted selectable>
              {result.link}
            </T>
            <Button kind="secondary" icon="share-outline" title={t('coach.shareLink')} onPress={() => share(result.link)} />
            <Button kind="ghost" icon="refresh" title={t('parent.checkAgain')} onPress={() => refreshProfile()} />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
