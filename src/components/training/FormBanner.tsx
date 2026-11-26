import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { adjustUndone, DOWN_PCT, lighter, lowReadiness } from '../../lib/suggest';
import { FONTS } from '../../lib/theme';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Button, IconButton, Row, T } from '../ui';

const ORANGE = '#E07A00';

/** V tréninku: při nízké připravenosti nabídne ubrat váhy o 5 %. */
export function FormBanner() {
  const { t, tap } = useSettings();
  const training = useTraining();
  const a = training.active;
  if (!a || a.formAdjusted !== undefined) return null;
  const score = lowReadiness(training.data, a.date);
  if (score === null) return null;
  const hasWeights = a.exercises.some((e) => e.sets.some((s) => !s.done && s.kg > 0));
  if (!hasWeights) return null;

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: ORANGE,
        padding: 14,
        gap: 10,
        backgroundColor: 'rgba(224,122,0,0.08)',
      }}
    >
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <Ionicons name="battery-half" size={22} color={ORANGE} />
        <View style={{ flex: 1, gap: 2 }}>
          <T style={{ fontFamily: FONTS.bold }}>{t('sug.lowTitle', { n: score })}</T>
          <T v="small" muted>
            {t('sug.lowText', { pct: DOWN_PCT })}
          </T>
        </View>
        <IconButton
          name="close"
          size={18}
          label={t('common.close')}
          onPress={() => training.updateActive((w) => ({ ...w, formAdjusted: false }))}
        />
      </Row>
      <Button
        small
        icon="trending-down"
        title={t('sug.lowApply', { pct: DOWN_PCT })}
        style={{ backgroundColor: ORANGE }}
        onPress={() => {
          tap('success');
          training.updateActive((w) => ({
            ...w,
            exercises: w.exercises.map((e) => adjustUndone(e, lighter)),
            formAdjusted: true,
          }));
        }}
      />
    </View>
  );
}
