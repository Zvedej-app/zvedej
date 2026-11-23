import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { SectionList, View } from 'react-native';
import { exerciseName } from '../../data/exercises';
import { formatDate, parseISODate, startOfWeek, toISODate, addDays } from '../../lib/date';
import { logSetCount, logTonnage } from '../../lib/training';
import { plural, type TKey } from '../../lib/i18n';
import type { WorkoutLog } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Card, Empty, Row, T } from '../ui';
import { formatTonnage } from './format';

export function LogView() {
  const { t, locale, settings, colors } = useSettings();
  const { data } = useTraining();

  const sections = useMemo(() => {
    const byWeek = new Map<string, WorkoutLog[]>();
    for (const l of [...data.logs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))) {
      const w = toISODate(startOfWeek(parseISODate(l.date)));
      byWeek.set(w, [...(byWeek.get(w) ?? []), l]);
    }
    return [...byWeek.entries()].map(([week, logs]) => ({
      week,
      tonnage: logs.reduce((a, l) => a + logTonnage(l), 0),
      data: logs,
    }));
  }, [data.logs]);

  if (!sections.length) return <Empty icon="book-outline" text={t('tr.noLogs')} />;

  return (
    <SectionList
      sections={sections}
      keyExtractor={(l) => l.id}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Row style={{ justifyContent: 'space-between', marginTop: 8, marginBottom: 2 }}>
          <T v="label" muted>
            {formatDate(section.week, locale, { day: 'numeric', month: 'numeric' })} –{' '}
            {formatDate(toISODate(addDays(parseISODate(section.week), 6)), locale, { day: 'numeric', month: 'numeric' })}
          </T>
          <T v="small" color={colors.primary} style={{ fontWeight: '700' }}>
            {plural(settings.lang, 'workout', section.data.length)} · {formatTonnage(section.tonnage, settings.unit)}
          </T>
        </Row>
      )}
      renderItem={({ item }) => (
        <Card onPress={() => router.push(`/log/${item.id}`)} style={{ marginBottom: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h3" style={{ flex: 1 }} numberOfLines={1}>
              {item.title}
            </T>
            <T v="small" muted>
              {formatDate(item.date, locale, { weekday: 'short', day: 'numeric', month: 'numeric' })}
            </T>
          </Row>
          <T v="small" muted numberOfLines={2}>
            {item.exercises.map((e) => exerciseName(e.exerciseId, settings.lang, data.customExercises, e.customName)).join(' · ')}
          </T>
          <Row gap={14}>
            <T v="caption" muted>
              {plural(settings.lang, 'set', logSetCount(item))}
            </T>
            <T v="caption" muted>
              {formatTonnage(logTonnage(item), settings.unit)}
            </T>
            {item.durationMin ? (
              <T v="caption" muted>
                {item.durationMin} min
              </T>
            ) : null}
            {item.rpe ? (
              <T v="caption" muted>
                RPE {item.rpe}
              </T>
            ) : null}
            {item.feeling ? (
              <T v="caption" muted>
                {t(`tr.feeling.${item.feeling}` as TKey)}
              </T>
            ) : null}
          </Row>
          {item.notes ? (
            <View>
              <T v="small" style={{ fontStyle: 'italic' }} numberOfLines={2}>
                „{item.notes}“
              </T>
            </View>
          ) : null}
        </Card>
      )}
    />
  );
}
