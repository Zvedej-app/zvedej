import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Banner, Button, Field, Header, IconButton, Screen, T } from '../components/ui';
import { api } from '../lib/api';
import { notify, toast } from '../lib/dialog';
import { useSettings } from '../providers/SettingsProvider';

/** Odvolání proti rozhodnutí moderátora (DSA čl. 20) */
export default function AppealScreen() {
  const { notice, reason } = useLocalSearchParams<{ notice: string; reason?: string }>();
  const { t } = useSettings();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (body.trim().length < 5) return notify(t('appeal.tooShort'));
    setBusy(true);
    try {
      await api.fileAppeal(notice, body.trim());
      toast(t('appeal.sent'));
      router.back();
    } catch (e) {
      const m = String((e as Error)?.message ?? '');
      notify(m.includes('ALREADY') ? t('appeal.already') : m.includes('TOO_LATE') ? t('appeal.tooLate') : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header
        left={<IconButton name="close" onPress={() => router.back()} label={t('common.back')} />}
        title={t('appeal.title')}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        {reason ? (
          <T muted>
            {t('notice.reason')}: {reason}
          </T>
        ) : null}
        <Banner icon="scale-outline" text={t('appeal.hint')} />
        <Field label={t('appeal.yourText')} value={body} onChangeText={setBody} multiline maxLength={2000} />
        <Button icon="send" title={t('appeal.send')} onPress={send} loading={busy} />
      </ScrollView>
    </Screen>
  );
}
