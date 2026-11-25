import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { toast } from '../../lib/dialog';
import { todayISO } from '../../lib/date';
import { readiness, wellnessFor } from '../../lib/wellness';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Card, Row, T } from '../ui';
import { CheckIn } from './CheckIn';
import { ReadinessRing, readinessText } from './ReadinessBadge';

/** Obrazovka Dnes: rychlý denní záznam regenerace (asi 10 s) nebo dnešní připravenost. */
export function WellnessCard() {
  const { t, colors } = useSettings();
  const training = useTraining();
  const { data } = training;
  const [open, setOpen] = useState(false);
  const today = wellnessFor(data);

  if (!data.wellnessConsentAt)
    return (
      <Card onPress={() => router.push('/wellness')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name="moon-outline" size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '800' }}>{t('well.title')}</T>
          <T v="caption" muted>
            {t('well.intro')}
          </T>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    );

  if (today) {
    const score = readiness(today);
    return (
      <Card onPress={() => router.push('/wellness')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <ReadinessRing score={score} size={58} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="label" muted>
            {t('well.readinessToday')}
          </T>
          <T style={{ fontWeight: '800' }}>{readinessText(score, t)}</T>
          {today.pain ? (
            <T v="caption" color={colors.accent}>
              {t('well.painNoted')}
            </T>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }} gap={10}>
        <Ionicons name="moon" size={22} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <T style={{ fontWeight: '800' }}>{t('well.howToday')}</T>
          <T v="caption" muted>
            {t('well.tenSeconds')}
          </T>
        </View>
        {!open && (
          <T color={colors.primary} style={{ fontWeight: '800' }} onPress={() => setOpen(true)}>
            {t('well.fillIn')}
          </T>
        )}
      </Row>
      {open && (
        <CheckIn
          compact
          initial={null}
          date={todayISO()}
          onSave={(e) => {
            training.saveWellness(e);
            setOpen(false);
            toast(t('well.saved'));
          }}
        />
      )}
    </Card>
  );
}
