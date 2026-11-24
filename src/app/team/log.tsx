import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { LogFeedback } from '../../components/coach/LogFeedback';
import { formatTonnage } from '../../components/training/format';
import { Card, Empty, Header, IconButton, Loading, Row, Screen, Stat, T } from '../../components/ui';
import { exerciseName } from '../../data/exercises';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/date';
import type { TKey } from '../../lib/i18n';
import { logSetCount, logTonnage } from '../../lib/training';
import type { TrainingData } from '../../lib/types';
import { formatBodyweight, formatWeight } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';

/** Trenér: trénink svěřence (jen ke čtení) s komentáři a videi. */
export default function CoachLogScreen() {
  const { athlete, log: logId } = useLocalSearchParams<{ athlete: string; log: string }>();
  const { t, settings, locale, colors } = useSettings();
  const [data, setData] = useState<TrainingData | null | undefined>(undefined);

  useEffect(() => {
    api
      .athleteTraining(athlete)
      .then(setData)
      .catch(() => setData(null));
  }, [athlete]);

  const log = data?.logs.find((l) => l.id === logId);

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={log ? formatDate(log.date, locale, { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
      />
      {data === undefined ? (
        <Loading />
      ) : !log ? (
        <Empty text={t('tr.noLogs')} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <T v="h2">{log.title}</T>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <Stat value={logSetCount(log)} label={t('tr.set')} />
            <Stat value={formatTonnage(logTonnage(log), settings.unit)} label={t('tr.tonnage')} />
            {log.durationMin ? <Stat value={`${log.durationMin}′`} label="min" /> : null}
            {log.rpe ? <Stat value={String(log.rpe).replace('.', ',')} label="RPE" /> : null}
          </Card>
          {(log.feeling || log.bodyweight) && (
            <Row gap={16}>
              {log.feeling ? <T>{t(`tr.feeling.${log.feeling}` as TKey)}</T> : null}
              {log.bodyweight ? (
                <T muted>
                  {t('pr.bodyweight')}: {formatBodyweight(log.bodyweight, settings.unit)}
                </T>
              ) : null}
            </Row>
          )}
          {log.notes ? (
            <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.accent }}>
              <T v="label" muted>
                {t('tr.workoutNotes')}
              </T>
              <T style={{ fontStyle: 'italic' }}>„{log.notes}“</T>
            </Card>
          ) : null}
          {log.exercises.map((e) => (
            <Card key={e.id} style={{ gap: 6 }}>
              <T v="h3">{exerciseName(e.exerciseId, settings.lang, data?.customExercises ?? [], e.customName)}</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {e.sets.map((s, i) => (
                  <View
                    key={i}
                    style={{
                      backgroundColor: colors.bg,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <T v="small" style={{ fontWeight: '700' }}>
                      {s.reps} × {formatWeight(s.kg, settings.unit)}
                    </T>
                  </View>
                ))}
              </View>
              {e.note ? (
                <T v="small" muted style={{ fontStyle: 'italic' }}>
                  {e.note}
                </T>
              ) : null}
            </Card>
          ))}
          <LogFeedback athleteId={athlete} logId={log.id} />
        </ScrollView>
      )}
    </Screen>
  );
}
