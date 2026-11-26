import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef } from 'react';
import { Image, Platform, Text, View, type TextStyle } from 'react-native';
import { exerciseName } from '../../data/exercises';
import type { Lang } from '../../lib/i18n';
import { formatDate } from '../../lib/date';
import { BLUE, FLAG, FONTS } from '../../lib/theme';
import { logSetCount, logTonnage } from '../../lib/training';
import type { WorkoutLog } from '../../lib/types';
import { formatNumber } from '../../lib/units';
import { formatTonnage } from '../training/format';

export type CardRef = React.ComponentRef<typeof View>;

/** Poměr karty 9 : 16 – přesně na Instagram story (1080 × 1920). */
export const CARD_RATIO = 16 / 9;
const GOLD = '#F1B100';
const ICON = require('../../../assets/images/logo-share.png');

export interface ShareRecord {
  exerciseId: string;
  customName?: string;
  kg: number;
  prev: number;
}

export type ShareCardProps = {
  width: number;
  lang: Lang;
  locale: string;
  labels: {
    workoutDone: string;
    record: string;
    sets: string;
    tonnage: string;
    minutes: string;
    weeksInRow: string;
    previous: string;
    more: string;
    tagline: string;
  };
  name?: string | null;
  customExercises?: { id: string; name: string }[];
  log: WorkoutLog;
  streak?: number;
  /** zobrazit kartu rekordu místo souhrnu tréninku */
  record?: ShareRecord | null;
};

const kgText = (kg: number) => `${formatNumber(kg, Number.isInteger(kg) ? 0 : 1)} kg`;

/** Sdílecí karta tréninku nebo osobního rekordu v barvách aplikace. Rozměry se počítají z `width`. */
export const ShareCard = forwardRef<CardRef, ShareCardProps>(function ShareCard(props, ref) {
  const { width, lang, locale, labels, name, customExercises, log, streak, record } = props;
  const u = width / 360;
  const height = width * CARD_RATIO;
  const txt = (size: number, font: string, color = '#FFFFFF', extra?: TextStyle): TextStyle => ({
    fontSize: size * u,
    lineHeight: size * u * 1.2,
    fontFamily: font,
    color,
    ...extra,
  });
  const date = formatDate(log.date, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View ref={ref} collapsable={false} style={{ width, height, overflow: 'hidden' }}>
      <LinearGradient
        colors={[BLUE[500], BLUE[600], BLUE[800]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
      />
      {/* jemné kruhy v pozadí – „kotouče“ */}
      <View
        style={{
          position: 'absolute',
          width: 300 * u,
          height: 300 * u,
          borderRadius: 150 * u,
          borderWidth: 26 * u,
          borderColor: 'rgba(255,255,255,0.05)',
          right: -120 * u,
          top: -70 * u,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 220 * u,
          height: 220 * u,
          borderRadius: 110 * u,
          borderWidth: 20 * u,
          borderColor: 'rgba(212,6,13,0.16)',
          left: -110 * u,
          bottom: 40 * u,
        }}
      />

      <View style={{ flex: 1, padding: 26 * u, paddingTop: 30 * u }}>
        {/* značka */}
        <View style={{ alignItems: 'center' }}>
          {Platform.OS === 'web' ? (
            // na webu obyčejný <img> – html2canvas ho vykreslí ostře
            React.createElement('img', {
              src: Asset.fromModule(ICON).uri,
              alt: 'Zvedej',
              style: { width: 84 * u, height: 84 * u, borderRadius: 20 * u, display: 'block' },
            })
          ) : (
            <Image source={ICON} style={{ width: 84 * u, height: 84 * u, borderRadius: 20 * u }} accessibilityLabel="Zvedej" />
          )}
        </View>

        <View style={{ flex: 1, justifyContent: 'center', paddingBottom: 20 * u }}>
          {record ? (
            <RecordBody {...props} u={u} txt={txt} date={date} record={record} />
          ) : (
            <WorkoutBody
              u={u}
              txt={txt}
              date={date}
              log={log}
              lang={lang}
              labels={labels}
              customExercises={customExercises}
              streak={streak ?? 0}
            />
          )}
        </View>
        {/* podpis */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 * u }}>
          <View style={{ flex: 1 }}>
            {name ? <Text style={txt(15, FONTS.bold)}>{name}</Text> : null}
            <Text style={txt(11, FONTS.medium, 'rgba(255,255,255,0.65)')}>{labels.tagline}</Text>
          </View>
          <View style={{ width: 36 * u, height: 6 * u, borderRadius: 3 * u, backgroundColor: FLAG.red }} />
        </View>
      </View>
    </View>
  );
});

type Txt = (size: number, font: string, color?: string, extra?: TextStyle) => TextStyle;

function Pill({
  center,
  u,
  txt,
  icon,
  text,
  bg,
  color,
}: {
  center?: boolean;
  u: number;
  txt: Txt;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  bg: string;
  color: string;
}) {
  return (
    <View
      style={{
        alignSelf: center ? 'center' : 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6 * u,
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 12 * u,
        paddingVertical: 6 * u,
      }}
    >
      <Ionicons name={icon} size={14 * u} color={color} />
      <Text style={txt(12, FONTS.black, color, { letterSpacing: 0.8 * u })}>{text.toUpperCase()}</Text>
    </View>
  );
}

function WorkoutBody({
  u,
  txt,
  date,
  log,
  lang,
  labels,
  customExercises,
  streak,
}: {
  u: number;
  txt: Txt;
  date: string;
  log: WorkoutLog;
  lang: Lang;
  labels: ShareCardProps['labels'];
  customExercises?: { id: string; name: string }[];
  streak: number;
}) {
  const rows = log.exercises
    .map((e) => {
      const done = e.sets.filter((s) => s.done);
      if (!done.length) return null;
      const top = Math.max(...done.map((s) => s.kg));
      const topReps = done.filter((s) => s.kg === top).map((s) => s.reps);
      return {
        id: e.id,
        name: exerciseName(e.exerciseId, lang, customExercises, e.customName),
        sets: done.length,
        detail: top > 0 ? `${Math.max(...topReps)} × ${kgText(top)}` : `${Math.max(...done.map((s) => s.reps))} ×`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const shown = rows.slice(0, 6);
  const tonnage = logTonnage(log);

  return (
    <View style={{ gap: 14 * u }}>
      <Pill u={u} txt={txt} icon="checkmark-circle" text={labels.workoutDone} bg={FLAG.red} color="#FFFFFF" />
      <View style={{ gap: 2 * u }}>
        <Text style={txt(30, FONTS.black)} numberOfLines={2}>
          {log.title}
        </Text>
        <Text style={txt(14, FONTS.medium, 'rgba(255,255,255,0.75)')}>{date}</Text>
      </View>

      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.09)',
          borderRadius: 16 * u,
          paddingVertical: 6 * u,
          paddingHorizontal: 14 * u,
        }}
      >
        {shown.map((r, i) => (
          <View
            key={r.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 9 * u,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: 'rgba(255,255,255,0.1)',
              gap: 8 * u,
            }}
          >
            <Text style={[txt(15, FONTS.bold), { flex: 1 }]} numberOfLines={1}>
              {r.name}
            </Text>
            <Text style={txt(13, FONTS.medium, 'rgba(255,255,255,0.65)')}>{r.sets}×</Text>
            <Text style={txt(15, FONTS.black)}>{r.detail}</Text>
          </View>
        ))}
        {rows.length > shown.length ? (
          <Text style={[txt(12, FONTS.medium, 'rgba(255,255,255,0.6)'), { paddingBottom: 8 * u }]}>
            {labels.more.replace('{n}', String(rows.length - shown.length))}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 * u }}>
        <Big u={u} txt={txt} value={String(logSetCount(log))} label={labels.sets} />
        <Big u={u} txt={txt} value={formatTonnage(tonnage, 'kg')} label={labels.tonnage} />
        {log.durationMin ? <Big u={u} txt={txt} value={`${log.durationMin}′`} label={labels.minutes} /> : null}
      </View>

      {streak > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * u }}>
          <Ionicons name="flame" size={22 * u} color="#FF8A3D" />
          <Text style={txt(16, FONTS.bold)}>{labels.weeksInRow}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Big({ u, txt, value, label }: { u: number; txt: Txt; value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.09)',
        borderRadius: 14 * u,
        paddingVertical: 12 * u,
        alignItems: 'center',
      }}
    >
      <Text style={txt(22, FONTS.black)}>{value}</Text>
      <Text style={txt(11, FONTS.medium, 'rgba(255,255,255,0.7)')}>{label}</Text>
    </View>
  );
}

function RecordBody({
  u,
  txt,
  date,
  record,
  lang,
  labels,
  customExercises,
}: ShareCardProps & { u: number; txt: Txt; date: string; record: ShareRecord }) {
  const diff = record.kg - record.prev;
  return (
    <View style={{ gap: 16 * u, alignItems: 'center' }}>
      <View
        style={{
          width: 96 * u,
          height: 96 * u,
          borderRadius: 48 * u,
          borderWidth: 2 * u,
          borderColor: GOLD,
          backgroundColor: 'rgba(255,255,255,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="trophy" size={50 * u} color={GOLD} />
      </View>
      <Pill center u={u} txt={txt} icon="star" text={labels.record} bg={GOLD} color={BLUE[800]} />
      <Text style={[txt(26, FONTS.black), { textAlign: 'center' }]} numberOfLines={2}>
        {exerciseName(record.exerciseId, lang, customExercises, record.customName)}
      </Text>
      <Text style={txt(84, FONTS.black, GOLD, { lineHeight: 92 * u })}>
        {formatNumber(record.kg, Number.isInteger(record.kg) ? 0 : 1)}
        <Text style={txt(30, FONTS.black, GOLD)}> kg</Text>
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 * u, alignItems: 'center' }}>
        <View style={{ backgroundColor: '#4CBB17', borderRadius: 999, paddingHorizontal: 12 * u, paddingVertical: 5 * u }}>
          <Text style={txt(15, FONTS.black)}>+{kgText(diff)}</Text>
        </View>
        <Text style={txt(14, FONTS.medium, 'rgba(255,255,255,0.75)')}>
          {labels.previous} {kgText(record.prev)}
        </Text>
      </View>
      <Text style={txt(14, FONTS.medium, 'rgba(255,255,255,0.75)')}>{date}</Text>
    </View>
  );
}
