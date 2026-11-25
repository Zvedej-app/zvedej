import type { ErrorBoundaryProps } from 'expo-router';
import * as Linking from 'expo-linking';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FEEDBACK_EMAIL } from '../lib/config';

/**
 * Obrazovka při neočekávané chybě (místo prázdné stránky). Nesmí záviset na providerech
 * (mohly spadnout i ony), proto má vlastní styly a text česky i anglicky.
 */
export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const report = () => {
    if (!FEEDBACK_EMAIL) return;
    const body = encodeURIComponent(`${error?.name}: ${error?.message}\n\n${String(error?.stack ?? '').slice(0, 1500)}`);
    Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Zvedej – chyba aplikace')}&body=${body}`);
  };
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🏋️</Text>
      <Text style={styles.title}>Něco se pokazilo</Text>
      <Text style={styles.text}>Tvoje tréninky jsou v bezpečí – ukládají se průběžně. Zkus to prosím znovu.</Text>
      <Text style={styles.sub}>Something went wrong. Your workouts are safe – please try again.</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={styles.btn}>
        <Text style={styles.btnText}>Zkusit znovu</Text>
      </Pressable>
      {FEEDBACK_EMAIL ? (
        <Pressable accessibilityRole="button" onPress={report} style={styles.link}>
          <Text style={styles.linkText}>Nahlásit chybu</Text>
        </Pressable>
      ) : null}
      <Text style={styles.detail} numberOfLines={3}>
        {error?.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10, backgroundColor: '#FFFFFF' },
  emoji: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: '800', color: '#0A1633', textAlign: 'center' },
  text: { fontSize: 16, color: '#0A1633', textAlign: 'center', lineHeight: 22 },
  sub: { fontSize: 13, color: '#5B6B84', textAlign: 'center' },
  btn: { marginTop: 10, backgroundColor: '#000072', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  link: { padding: 10 },
  linkText: { color: '#000072', fontWeight: '700' },
  detail: { marginTop: 12, fontSize: 11, color: '#9DB0CC', textAlign: 'center' },
});
