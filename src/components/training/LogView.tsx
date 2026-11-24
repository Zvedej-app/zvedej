import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { SectionList, View } from 'react-native';
import { exerciseName } from '../../data/exercises';
import { formatDate, parseISODate, startOfWeek, toISODate, addDays } from '../../lib/date';
import { logSetCount, logTonnage } from '../../lib/training';
import { type TKey, plural } from '../../lib/i18n';
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
            {plural(settings.lang, 'workout', section.data.length)} · {t('tr.log.weekTonnage')}{' '}
            {formatTonnage(section.tonnage, settings.unit)}
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
          {/* všechny cviky celé, zalomené do štítků */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {item.exercises.map((e, i) => (
              <View
                key={i}
                style={{ backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}
              >
                <T v="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                  {exerciseName(e.exerciseId, settings.lang, data.customExercises, e.customName)}
                </T>
              </View>
            ))}
          </View>
          {/* ukazatele s popisky */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: 12,
              rowGap: 10,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 10,
            }}
          >
            <LogStat label={t('tr.log.sets')} value={String(logSetCount(item))} />
            <LogStat label={t('tr.log.tonnage')} value={formatTonnage(logTonnage(item), settings.unit)} />
            {item.durationMin ? <LogStat label={t('tr.log.duration')} value={`${item.durationMin} min`} /> : null}
            {item.rpe ? <LogStat label={t('tr.log.rpe')} value={String(item.rpe)} /> : null}
            {item.feeling ? <LogStat label={t('tr.log.feeling')} value={t(`tr.feeling.${item.feeling}` as TKey)} /> : null}
          </View>
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

/** Jeden ukazatel tréninku: popisek nahoře, hodnota pod ním (tři vedle sebe) */
function LogStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '33.33%', paddingRight: 8, gap: 1 }}>
      <T v="caption" muted numberOfLines={1}>
        {label}
      </T>
      <T style={{ fontWeight: '800' }}>{value}</T>
    </View>
  );
}
