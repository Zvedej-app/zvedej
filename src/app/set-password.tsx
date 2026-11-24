import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Banner, Button, Field, Header, IconButton, Screen } from '../components/ui';
import { api } from '../lib/api';
import { notify, toast } from '../lib/dialog';
import { useSettings } from '../providers/SettingsProvider';

/** Po potvrzení e-mailu si bývalý host nastaví heslo. */
export default function SetPasswordScreen() {
  const { t } = useSettings();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (pw.length < 6) return notify(t('auth.invalid'));
    if (pw !== pw2) return notify(t('guest.passwordMismatch'));
    setBusy(true);
    try {
      await api.setPassword(pw);
      toast(t('guest.passwordSet'));
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      notify(String((e as Error)?.message ?? '') || t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header
        left={
          <IconButton
            name="close"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            label={t('common.back')}
          />
        }
        title={t('guest.setPassword')}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Banner icon="lock-closed-outline" text={t('guest.setPasswordHint')} />
        <Field label={t('auth.password')} value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" />
        <Field
          label={t('guest.passwordAgain')}
          value={pw2}
          onChangeText={setPw2}
          secureTextEntry
          autoComplete="new-password"
          onSubmitEditing={save}
        />
        <Button icon="checkmark" title={t('common.save')} onPress={save} loading={busy} />
      </ScrollView>
    </Screen>
  );
}
