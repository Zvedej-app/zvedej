import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Banner, Header, IconButton, Screen, T } from '../../components/ui';
import { LEGAL_UPDATED, OPERATOR, legalDoc, type LegalDoc } from '../../data/legal';
import { useSettings } from '../../providers/SettingsProvider';

/** Zásady ochrany osobních údajů / Podmínky použití (dostupné i bez přihlášení). */
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { t, settings, locale } = useSettings();
  const kind: LegalDoc = doc === 'terms' ? 'terms' : 'privacy';
  const sections = legalDoc(kind, settings.lang);
  const draft = OPERATOR.name.startsWith('[');
  const updated = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(LEGAL_UPDATED),
  );

  return (
    <Screen>
      <Header
        left={
          <IconButton
            name="chevron-back"
            label={t('common.back')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        }
        title={kind === 'terms' ? t('legal.terms') : t('legal.privacy')}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <T v="h2">{kind === 'terms' ? t('legal.terms') : t('legal.privacy')}</T>
        <T v="small" muted>
          {t('legal.updated')} {updated}
        </T>
        {draft && <Banner icon="construct-outline" text={t('legal.draft')} />}
        {sections.map((s) => (
          <View key={s.h} style={{ gap: 8 }}>
            <T v="h3">{s.h}</T>
            {s.p.map((p, i) => (
              <T key={i} style={{ lineHeight: 22 }} selectable>
                {p}
              </T>
            ))}
          </View>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}
