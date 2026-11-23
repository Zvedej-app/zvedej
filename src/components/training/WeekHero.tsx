import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { addDays, parseISODate, startOfWeek, toISODate, weekdayMon0 } from '../../lib/date';
import { plural, type TKey } from '../../lib/i18n';
import { BLUE, FONTS, FLAG, GOLD, GOLD_GLOW } from '../../lib/theme';
import { weekStats, weekStreak } from '../../lib/training';
import type { TrainingData, TrainingPlan } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';
import { formatTonnage } from './format';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Kroužek postupu (0–1), plynule se dotáčí při změně */
function Ring({ progress, size = 86, stroke = 9 }: { progress: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(1, Math.max(0, progress)),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, progress]);
  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [c, 0] });
  // kreslicí plocha je o okraj větší, aby se zlatá záře neořízla
  const pad = 9;
  const box = size + pad * 2;
  const cx = box / 2;
  return (
    <Svg width={box} height={box} style={{ margin: -pad, transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={cx} cy={cx} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} fill="none" />
      {/* splněný cíl: zlatá záře pod kroužkem */}
      {progress >= 1 && (
        <>
          <Circle cx={cx} cy={cx} r={r} stroke={GOLD} strokeOpacity={0.12} strokeWidth={stroke + 16} fill="none" />
          <Circle cx={cx} cy={cx} r={r} stroke={GOLD} strokeOpacity={0.22} strokeWidth={stroke + 9} fill="none" />
          <Circle cx={cx} cy={cx} r={r} stroke={GOLD} strokeOpacity={0.35} strokeWidth={stroke + 4} fill="none" />
        </>
      )}
      <AnimatedCircle
        cx={cx}
        cy={cx}
        r={r}
        stroke={progress >= 1 ? GOLD : '#FFFFFF'}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={offset}
      />
    </Svg>
  );
}

/**
 * Hlavní karta záložky Dnes: série týdnů s plamenem, kroužek týdenního cíle
 * a pás sedmi dní (odtrénované dny, dnešek, naplánované dny).
 */
export function WeekHero({ data, plan }: { data: TrainingData; plan: TrainingPlan | null }) {
  const { t, settings } = useSettings();
  const now = new Date();
  const today = weekdayMon0(now);
  // memoizaci řeší React Compiler
  const stats = weekStats(data);
  const streak = weekStreak(data);
  const mondayISO = toISODate(startOfWeek(now));
  const loggedDates = new Set(data.logs.map((l) => l.date));
  const monday = parseISODate(mondayISO);
  const trained = Array.from({ length: 7 }, (_, i) => loggedDates.has(toISODate(addDays(monday, i))));
  const planned = new Set(plan?.days.flatMap((d) => d.weekdays) ?? []);
  // cíl: počet tréninkových dní v plánu, bez plánu 3 tréninky týdně
  const goal = Math.max(1, planned.size || 3);
  const done = stats.count;
  const reached = done >= goal;

  return (
    <LinearGradient colors={[BLUE[500], BLUE[600], BLUE[800]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.top}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.flameRow}>
            <Ionicons name="flame" size={30} color={streak > 0 ? '#FF8A3D' : 'rgba(255,255,255,0.35)'} />
            <Text style={styles.big}>{streak}</Text>
          </View>
          <Text style={styles.sub}>
            {streak > 0 ? `${plural(settings.lang, 'week', streak).replace(/^\d+ /, '')} ${t('cel.inRow')}` : t('tr.streakStart')}
          </Text>
          <Text style={styles.ton}>
            {t('tr.tonnage')}: {formatTonnage(stats.tonnage, settings.unit)}
          </Text>
        </View>
        <View style={styles.ringWrap}>
          <Ring progress={done / goal} />
          <View style={styles.ringCenter}>
            {reached ? (
              <Ionicons name="trophy" size={28} color={GOLD} style={{ textShadowColor: GOLD_GLOW, textShadowRadius: 10 }} />
            ) : (
              <Text style={styles.ringText}>
                {done}
                <Text style={styles.ringOf}>/{goal}</Text>
              </Text>
            )}
          </View>
          <Text style={styles.ringLabel}>{reached ? t('tr.weekGoalDone') : t('tr.weekGoal')}</Text>
        </View>
      </View>

      <View style={styles.days}>
        {trained.map((on, i) => {
          const isToday = i === today;
          const plannedDay = planned.has(i);
          return (
            <View key={i} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
              <Text style={[styles.dayName, isToday && { color: '#FFF' }]}>{t(`tr.weekday.${i}` as TKey)}</Text>
              <View
                style={[
                  styles.dot,
                  on && { backgroundColor: FLAG.red, borderColor: FLAG.red },
                  !on && plannedDay && { borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.6)' },
                  isToday && !on && { borderColor: '#FFF', borderWidth: 2 },
                ]}
              >
                {on && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
            </View>
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 18, gap: 18, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  big: { color: '#FFF', fontSize: 44, lineHeight: 48, fontFamily: FONTS.black },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '500' },
  ton: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 4 },
  ringWrap: { alignItems: 'center', gap: 4 },
  ringCenter: { position: 'absolute', top: 0, height: 86, width: 86, alignItems: 'center', justifyContent: 'center' },
  ringText: { color: '#FFF', fontSize: 26, fontFamily: FONTS.black },
  ringOf: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontFamily: FONTS.semi },
  ringLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: FONTS.semi, letterSpacing: 0.4 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  dayName: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: FONTS.semi },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
