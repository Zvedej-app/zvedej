import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarbellLogo } from '../components/Logo';
import { Banner, Button, Field, Row, T } from '../components/ui';
import { api } from '../lib/api';
import { LANG_LABELS, type Lang } from '../lib/i18n';
import { BLUE } from '../lib/theme';
import { useIsDesktop } from '../lib/layout';
import { useSettings } from '../providers/SettingsProvider';

export default function AuthScreen() {
  const { t, colors, settings, update } = useSettings();
  const desktop = useIsDesktop();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const notify = (m: string) => setMsg(m);

  const submit = async () => {
    if (!email.includes('@') || password.length < 6) return notify(t('auth.invalid'));
    setBusy(true);
    setMsg(null);
    try {
      if (mode === 'login') await api.signIn(email, password);
      else {
        const r = await api.signUp(email, password, firstName, lastName);
        if (r.needsConfirmation) notify(t('auth.checkEmail'));
      }
    } catch (e: any) {
      notify(e?.message ?? t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    // na počítači: vlevo modrá úvodní plocha s logem, vpravo formulář
    <View style={{ flex: 1, backgroundColor: colors.bg, flexDirection: desktop ? 'row' : 'column' }}>
      <LinearGradient colors={[BLUE[500], BLUE[800]]} style={desktop ? { flex: 1, justifyContent: 'center' } : styles.hero}>
        <SafeAreaView edges={['top']} style={{ alignItems: 'center', gap: 6, paddingBottom: 28, paddingTop: 24 }}>
          <BarbellLogo size={150} color="#FFFFFF" accent={BLUE[200]} />
          <T v="h1" color="#FFFFFF" style={{ fontSize: 40, fontWeight: '900' }}>
            Zvedej
          </T>
          <T color="rgba(255,255,255,0.85)" style={{ textAlign: 'center', paddingHorizontal: 32 }}>
            {t('auth.subtitle')}
          </T>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={desktop ? { width: 520, justifyContent: 'center' } : { flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[{ padding: 20, gap: 12 }, desktop && { padding: 48, flexGrow: 1, justifyContent: 'center' }]}
          keyboardShouldPersistTaps="handled"
        >
          <T v="h2">{mode === 'login' ? t('auth.login') : t('auth.register')}</T>
          {mode === 'register' && (
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
          )}
          <Field
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Field
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onSubmitEditing={submit}
          />
          {msg && <Banner text={msg} />}
          <Button title={mode === 'login' ? t('auth.login') : t('auth.register')} onPress={submit} loading={busy} />
          <Button
            kind="ghost"
            title={mode === 'login' ? t('auth.toRegister') : t('auth.toLogin')}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          />
          {mode === 'login' && api.mode === 'supabase' && (
            <Button
              kind="ghost"
              small
              title={t('auth.forgot')}
              onPress={async () => {
                if (!email.includes('@')) return notify(t('auth.invalid'));
                try {
                  await api.resetPassword(email);
                  notify(t('auth.resetSent'));
                } catch (e: any) {
                  notify(e?.message ?? t('common.error'));
                }
              }}
            />
          )}
          {mode === 'register' && (
            <T v="caption" muted style={{ textAlign: 'center' }}>
              {t('auth.terms')}
            </T>
          )}
          {api.mode === 'demo' && (
            <>
              <Banner text={t('common.demo')} />
              <Button kind="secondary" icon="flash-outline" title={t('auth.demo')} onPress={() => api.signInDemo?.()} />
            </>
          )}
          <Row style={{ justifyContent: 'center', marginTop: 8 }} gap={16}>
            {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
              <Button
                key={l}
                kind={settings.lang === l ? 'secondary' : 'ghost'}
                small
                title={LANG_LABELS[l]}
                onPress={() => update({ lang: l })}
              />
            ))}
          </Row>
          <T v="caption" muted style={{ textAlign: 'center', marginTop: 12 }}>
            {t('app.by')}
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
});
