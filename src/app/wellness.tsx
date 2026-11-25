import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { BarChart } from '../components/coach/Charts';
import { Banner, Button, Card, Chip, Header, IconButton, ListGroup, ListItem, Row, Screen, T } from '../components/ui';
import { CheckIn } from '../components/wellness/CheckIn';
import { ReadinessRing, readinessText } from '../components/wellness/ReadinessBadge';
import { addDays, formatDate, toISODate, todayISO } from '../lib/date';
import { confirm, toast } from '../lib/dialog';
import type { TKey } from '../lib/i18n';
import { readiness, weekReadiness, wellnessSeries } from '../lib/wellness';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

/** Deník regenerace: denní záznam, připravenost, graf a nastavení sdílení. */
export default function WellnessScreen() {
  const { t, colors, locale } = useSettings();
  const training = useTraining();
  const { data } = training;
  const [consent, setConsent] = useState(false);
  const [date, setDate] = useState(todayISO());
  const entries = data.wellness ?? [];
  const entry = entries.find((w) => w.date === date) ?? null;
  const series = wellnessSeries(entries, 28);
  const week = weekReadiness(entries);

  const header = (
    <Header
      left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
      title={t('well.title')}
    />
  );

  // výslovný souhlas se zpracováním údajů o zdraví (GDPR čl. 9 odst. 2 písm. a)
  if (!data.wellnessConsentAt)
    return (
      <Screen>
        {header}
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Ionicons name="moon" size={44} color={colors.primary} />
            <T v="h2" style={{ textAlign: 'center' }}>
              {t('well.title')}
            </T>
            <T muted style={{ textAlign: 'center' }}>
              {t('well.what')}
            </T>
          </View>
          <Banner icon="shield-checkmark-outline" text={t('well.consentInfo')} />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            onPress={() => setConsent(!consent)}
            style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}
          >
            <Ionicons
              name={consent ? 'checkbox' : 'square-outline'}
              size={24}
              color={consent ? colors.primary : colors.textMuted}
            />
            <T v="small" style={{ flex: 1, lineHeight: 20 }}>
              {t('well.consentText')}
            </T>
          </Pressable>
          <Button
            icon="checkmark"
            title={t('well.start')}
            disabled={!consent}
            onPress={() => training.setWellnessConsent(true)}
          />
          <Button kind="ghost" small title={t('legal.privacy')} onPress={() => router.push('/legal/privacy')} />
        </ScrollView>
      </Screen>
    );

  const days = Array.from({ length: 7 }, (_, i) => toISODate(addDays(new Date(), -i)));

  return (
    <Screen>
      {header}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {week !== null && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <ReadinessRing score={week} size={64} />
            <View style={{ flex: 1 }}>
              <T v="label" muted>
                {t('well.weekAvg')}
              </T>
              <T style={{ fontWeight: '800' }}>{readinessText(week, t)}</T>
              <T v="caption" muted>
                {t(`well.advice.${week >= 70 ? 'good' : week >= 45 ? 'ok' : 'low'}` as TKey)}
              </T>
            </View>
          </Card>
        )}

        <Card style={{ gap: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {days.map((d) => (
              <Chip
                key={`${d}-${entries.some((w) => w.date === d) ? 1 : 0}`}
                label={d === todayISO() ? t('common.today') : formatDate(d, locale, { weekday: 'short', day: 'numeric' })}
                icon={entries.some((w) => w.date === d) ? 'checkmark-circle' : undefined}
                on={date === d}
                onPress={() => setDate(d)}
              />
            ))}
          </ScrollView>
          {entry && (
            <Row gap={10}>
              <ReadinessRing score={readiness(entry)} size={44} />
              <T v="small" muted style={{ flex: 1 }}>
                {t('well.editHint')}
              </T>
            </Row>
          )}
          <CheckIn
            key={date + (entry?.updatedAt ?? '')}
            initial={entry}
            date={date}
            onSave={(e) => {
              training.saveWellness(e);
              toast(t('well.saved'));
            }}
          />
        </Card>

        {series.length > 1 && (
          <Card style={{ gap: 10 }}>
            <T v="h3">{t('well.chart')}</T>
            <BarChart
              bars={series.map((s) => ({
                label: formatDate(s.date, locale, { day: 'numeric', month: 'numeric' }),
                value: s.score,
              }))}
              format={(v) => String(Math.round(v))}
            />
            <T v="caption" muted>
              {t('well.chartHint')}
            </T>
          </Card>
        )}

        <ListGroup title={t('well.privacy')}>
          <ListItem
            icon="people-outline"
            title={t('well.shareCoach')}
            subtitle={t('well.shareCoachHint')}
            toggle={!!data.wellnessShareCoach}
            onToggle={(v) => training.setWellnessShareCoach(v)}
          />
          <ListItem
            icon="trash-outline"
            danger
            title={t('well.revoke')}
            onPress={async () => {
              if (!(await confirm(t('well.revokeQ'), { ok: t('well.revoke'), cancel: t('common.cancel'), destructive: true })))
                return;
              training.setWellnessConsent(false);
              router.back();
            }}
          />
        </ListGroup>
      </ScrollView>
    </Screen>
  );
}
