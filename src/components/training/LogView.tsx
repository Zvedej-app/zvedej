import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { exerciseName } from '../../data/exercises';
import { addDays, formatDate, parseISODate, startOfWeek, toISODate, todayISO } from '../../lib/date';
import { plural, type TKey } from '../../lib/i18n';
import { FONTS } from '../../lib/theme';
import { logSetCount, logTonnage } from '../../lib/training';
import { api } from '../../lib/api';
import type { TrainingData, WorkoutLog } from '../../lib/types';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Empty, PressScale, T } from '../ui';
import { formatTonnage } from './format';

interface WeekSection {
  week: string;
  tonnage: number;
  sets: number;
  /** odtrénované dny týdne (0 = pondělí) */
  days: boolean[];
  data: WorkoutLog[];
}

/**
 * Deník tréninků po týdnech. Každý týden má souhrn se 7 dny (odtrénované dny jsou
 * vybarvené), pod ním karty tréninků s výrazným datem, cviky ve štítcích a ukazateli s popisky.
 */
/** Vlastní deník (záložka Deník) – s počtem nepřečtených komentářů od trenéra. */
export function LogView() {
  const { data } = useTraining();
  const { session } = useAuth();
  const [unread, setUnread] = useState<Record<string, number>>({});
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .unreadComments()
        .then((u) => alive && setUnread(u))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );
  const me = session?.userId ?? '';
  return (
    <LogList
      logs={data.logs}
      customExercises={data.customExercises}
      onOpen={(l) => router.push(`/log/${l.id}`)}
      unread={(l) => unread[`${me}:${l.id}`] ?? 0}
    />
  );
}

/** Seznam tréninků po týdnech – použitý ve vlastním deníku i v deníku svěřence u trenéra. */
export function LogList({
  logs,
  customExercises,
  onOpen,
  unread,
  header,
}: {
  logs: WorkoutLog[];
  customExercises: TrainingData['customExercises'];
  onOpen: (log: WorkoutLog) => void;
  unread?: (log: WorkoutLog) => number;
  header?: React.ReactElement;
}) {
  const { t, settings, colors } = useSettings();

  const sections = useMemo<WeekSection[]>(() => {
    const byWeek = new Map<string, WorkoutLog[]>();
    for (const l of [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))) {
      const w = toISODate(startOfWeek(parseISODate(l.date)));
      byWeek.set(w, [...(byWeek.get(w) ?? []), l]);
    }
    return [...byWeek.entries()].map(([week, logs]) => {
      const monday = parseISODate(week);
      const dates = new Set(logs.map((l) => l.date));
      return {
        week,
        tonnage: logs.reduce((a, l) => a + logTonnage(l), 0),
        sets: logs.reduce((a, l) => a + logSetCount(l), 0),
        days: Array.from({ length: 7 }, (_, i) => dates.has(toISODate(addDays(monday, i)))),
        data: logs,
      };
    });
  }, [logs]);

  if (!sections.length)
    return (
      <View style={{ flex: 1 }}>
        {header}
        <Empty icon="book-outline" text={t('tr.noLogs')} />
      </View>
    );

  const thisWeek = toISODate(startOfWeek(new Date()));
  const lastWeek = toISODate(addDays(startOfWeek(new Date()), -7));

  return (
    <SectionList
      sections={sections}
      keyExtractor={(l) => l.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 48 }}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <WeekHeader
          section={section}
          label={section.week === thisWeek ? t('log.thisWeek') : section.week === lastWeek ? t('log.lastWeek') : null}
        />
      )}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <LogCard log={item} customExercises={customExercises} onOpen={onOpen} unread={unread?.(item) ?? 0} />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      SectionSeparatorComponent={() => <View style={{ height: 14 }} />}
      ListFooterComponent={
        <T v="caption" muted style={{ textAlign: 'center', marginTop: 28 }}>
          {t('log.allTime')}: {plural(settings.lang, 'workout', logs.length)}
        </T>
      }
      style={{ backgroundColor: colors.bg }}
    />
  );
}

/** Souhrn týdne: název, pás 7 dní a tři čísla s popisky */
function WeekHeader({ section, label }: { section: WeekSection; label: string | null }) {
  const { t, locale, settings, colors } = useSettings();
  const monday = parseISODate(section.week);
  const range = `${formatDate(section.week, locale, { day: 'numeric', month: 'numeric' })} – ${formatDate(
    toISODate(addDays(monday, 6)),
    locale,
    { day: 'numeric', month: 'numeric' },
  )}`;
  const today = todayISO();

  return (
    <View style={{ marginTop: 22, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
        <T v="h2" style={{ fontSize: 20 }}>
          {label ?? range}
        </T>
        {label ? (
          <T v="small" muted>
            {range}
          </T>
        ) : null}
      </View>

      <View
        style={{
          backgroundColor: colors.primarySoft,
          borderRadius: 18,
          paddingVertical: 12,
          paddingHorizontal: 14,
          gap: 12,
        }}
      >
        {/* pás dní: odtrénované dny červeně s fajfkou */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {section.days.map((on, i) => {
            const iso = toISODate(addDays(monday, i));
            const isToday = iso === today;
            return (
              <View key={i} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                <T v="caption" color={on ? colors.text : colors.textMuted} style={{ fontFamily: FONTS.semi }}>
                  {t(`tr.weekday.${i}` as TKey)}
                </T>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on ? colors.accent : 'transparent',
                    borderWidth: on ? 0 : isToday ? 2 : 1.5,
                    borderColor: isToday ? colors.primary : colors.border,
                  }}
                >
                  {on ? (
                    <Ionicons name="checkmark" size={17} color="#FFF" />
                  ) : (
                    <T v="caption" muted>
                      {addDays(monday, i).getDate()}
                    </T>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row' }}>
          <WeekNum
            value={String(section.data.length)}
            label={plural(settings.lang, 'workout', section.data.length).replace(/^\d+ /, '')}
          />
          <WeekNum value={String(section.sets)} label={plural(settings.lang, 'set', section.sets).replace(/^\d+ /, '')} />
          <WeekNum value={formatTonnage(section.tonnage, settings.unit)} label={t('log.weekTonnage')} />
        </View>
      </View>
    </View>
  );
}

function WeekNum({ value, label }: { value: string; label: string }) {
  const { colors } = useSettings();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T style={{ fontFamily: FONTS.black, fontSize: 18 }} color={colors.primary}>
        {value}
      </T>
      <T v="caption" muted>
        {label}
      </T>
    </View>
  );
}

/** Karta jednoho tréninku */
function LogCard({
  log,
  customExercises,
  onOpen,
  unread,
}: {
  log: WorkoutLog;
  customExercises: TrainingData['customExercises'];
  onOpen: (log: WorkoutLog) => void;
  unread: number;
}) {
  const { t, locale, settings, colors } = useSettings();
  const d = parseISODate(log.date);
  const isToday = log.date === todayISO();

  return (
    <PressScale
      onPress={() => onOpen(log)}
      scaleTo={0.98}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {/* výrazné datum */}
        <View
          style={{
            width: 54,
            paddingVertical: 7,
            borderRadius: 14,
            backgroundColor: isToday ? colors.accent : colors.primary,
            alignItems: 'center',
          }}
        >
          <T
            v="caption"
            color="rgba(255,255,255,0.85)"
            style={{ fontFamily: FONTS.bold, textTransform: 'uppercase', fontSize: 11 }}
          >
            {formatDate(log.date, locale, { weekday: 'short' }).replace('.', '')}
          </T>
          <T color="#FFF" style={{ fontFamily: FONTS.black, fontSize: 22, lineHeight: 26 }}>
            {d.getDate()}
          </T>
          <T v="caption" color="rgba(255,255,255,0.85)" style={{ fontSize: 11 }}>
            {`${d.getMonth() + 1}.`}
          </T>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <T v="h3" numberOfLines={2}>
            {log.title}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2 }}>
            {isToday ? (
              <T v="caption" color={colors.accent} style={{ fontFamily: FONTS.bold }}>
                {t('log.today')}
              </T>
            ) : null}
            {log.durationMin ? <Meta icon="time-outline" text={`${log.durationMin} min`} /> : null}
            {log.feeling ? <Meta text={t(`tr.feeling.${log.feeling}` as TKey)} /> : null}
          </View>
        </View>
        {unread > 0 ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: colors.accent,
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Ionicons name="chatbubble" size={12} color="#FFF" />
            <T v="caption" color="#FFF" style={{ fontFamily: FONTS.bold }}>
              {unread}
            </T>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        )}
      </View>

      {/* všechny cviky celé, zalomené do štítků */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {log.exercises.map((e, i) => (
          <View
            key={i}
            style={{
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <T v="caption" style={{ fontFamily: FONTS.semi }}>
              {exerciseName(e.exerciseId, settings.lang, customExercises, e.customName)}
            </T>
          </View>
        ))}
      </View>

      {/* ukazatele s popisky */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 14, paddingVertical: 10 }}>
        <LogStat label={t('tr.log.sets')} value={String(logSetCount(log))} />
        <Divider />
        <LogStat label={t('tr.log.tonnage')} value={formatTonnage(logTonnage(log), settings.unit)} />
        {log.rpe ? (
          <>
            <Divider />
            <LogStat label={t('tr.log.rpe')} value={`${String(log.rpe).replace('.', ',')}/10`} />
          </>
        ) : null}
      </View>

      {log.notes ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
          <T v="small" muted style={{ flex: 1, fontStyle: 'italic' }} numberOfLines={3}>
            {log.notes}
          </T>
        </View>
      ) : null}
    </PressScale>
  );
}

function Meta({ icon, text }: { icon?: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  const { colors } = useSettings();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {icon ? <Ionicons name={icon} size={13} color={colors.textMuted} /> : null}
      <T v="caption" muted>
        {text}
      </T>
    </View>
  );
}

function Divider() {
  const { colors } = useSettings();
  return <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 2 }} />;
}

/** Jeden ukazatel: hodnota a pod ní popisek */
function LogStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4, gap: 1 }}>
      <T style={{ fontFamily: FONTS.black, fontSize: 17 }}>{value}</T>
      <T v="caption" muted numberOfLines={1} style={{ textAlign: 'center' }}>
        {label}
      </T>
    </View>
  );
}
