import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Achievement } from '../../lib/achievements';
import { plural, type TKey } from '../../lib/i18n';
import { BLUE, FONTS, FLAG } from '../../lib/theme';
import { useSettings } from '../../providers/SettingsProvider';
import { Button } from '../ui';

const COLORS = [FLAG.red, '#FFFFFF', '#FFD23F', '#4F86C9', FLAG.red, '#FFFFFF'];
const PIECES = 46;

/** Jeden kousek konfet: padá s mírným kýváním a otáčením */
function Piece({ i, width, height }: { i: number; width: number; height: number }) {
  const [p] = useState(() => new Animated.Value(0));
  const [cfg] = useState(() => ({
    x: Math.random() * width,
    drift: (Math.random() - 0.5) * 120,
    size: 7 + Math.random() * 7,
    delay: Math.random() * 500,
    dur: 1900 + Math.random() * 1400,
    spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
    round: Math.random() > 0.6,
  }));
  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: cfg.dur,
      delay: cfg.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [p, cfg]);
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [-40, height * 0.95] });
  const translateX = p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, cfg.drift, cfg.drift * 0.4] });
  const rotate = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${cfg.spin}deg`] });
  const opacity = p.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cfg.x,
        top: 0,
        width: cfg.size,
        height: cfg.round ? cfg.size : cfg.size * 1.8,
        borderRadius: cfg.round ? cfg.size / 2 : 2,
        backgroundColor: COLORS[i % COLORS.length],
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }],
      }}
    />
  );
}

export interface CelebrationData {
  sets: number;
  tonnage: string;
  minutes: number | null;
  streak: number;
  badges: Achievement[];
}

/** Oslava po dokončení tréninku: konfety, shrnutí a nově získané odznaky. */
export function Celebration({ data, onClose }: { data: CelebrationData | null; onClose: () => void }) {
  const { t, settings } = useSettings();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [pop] = useState(() => new Animated.Value(0));
  const [cheer] = useState(() => Math.floor(Math.random() * 4));
  useEffect(() => {
    if (!data) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 9, bounciness: 12 }).start();
  }, [data, pop]);
  if (!data) return null;
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <LinearGradient colors={[BLUE[500], BLUE[600], BLUE[800]]} style={StyleSheet.absoluteFill} />
      <View style={[styles.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View style={{ alignItems: 'center', gap: 10, opacity: pop, transform: [{ scale }] }}>
          <View style={styles.medal}>
            <Ionicons name="trophy" size={56} color="#FFD23F" />
          </View>
          <Text style={styles.title}>{t('cel.title')}</Text>
          <Text style={styles.cheer}>{t(`cel.cheer.${cheer}` as TKey)}</Text>
        </Animated.View>

        <View style={styles.stats}>
          <Stat value={String(data.sets)} label={t('cel.sets')} />
          <Stat value={data.tonnage} label={t('tr.tonnage')} />
          {data.minutes ? <Stat value={String(data.minutes)} label={t('cel.minutes')} /> : null}
        </View>

        {data.streak > 0 && (
          <View style={styles.streak}>
            <Ionicons name="flame" size={26} color="#FF8A3D" />
            <Text style={styles.streakText}>
              {plural(settings.lang, 'week', data.streak)} {t('cel.inRow')}
            </Text>
          </View>
        )}

        {data.badges.length > 0 && (
          <View style={{ gap: 10, alignSelf: 'stretch' }}>
            <Text style={styles.badgeHead}>{t('cel.newBadge')}</Text>
            {data.badges.map((b) => (
              <View key={b.id} style={styles.badge}>
                <View style={[styles.badgeIcon, { backgroundColor: b.color }]}>
                  <Ionicons name={b.icon} size={24} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.badgeTitle}>{t(b.title)}</Text>
                  <Text style={styles.badgeDesc}>{t(b.desc)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ flex: 1 }} />
        <Button
          title={t('cel.continue')}
          onPress={onClose}
          style={{ alignSelf: 'stretch', minHeight: 56, borderRadius: 16, backgroundColor: FLAG.red }}
        />
      </View>
      {Array.from({ length: PIECES }, (_, i) => (
        <Piece key={i} i={i} width={width} height={height} />
      ))}
    </Modal>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', paddingHorizontal: 24, gap: 22, width: '100%', maxWidth: 520, alignSelf: 'center' },
  medal: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,210,63,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#FFF', fontSize: 34, fontFamily: FONTS.black, textAlign: 'center' },
  cheer: { color: 'rgba(255,255,255,0.85)', fontSize: 17, fontFamily: FONTS.medium, textAlign: 'center' },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 16,
  },
  statValue: { color: '#FFF', fontSize: 26, fontFamily: FONTS.black },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: FONTS.medium },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakText: { color: '#FFF', fontSize: 18, fontFamily: FONTS.bold },
  badgeHead: {
    color: '#FFD23F',
    fontSize: 14,
    fontFamily: FONTS.semi,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 12,
  },
  badgeIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  badgeTitle: { color: '#FFF', fontSize: 17, fontFamily: FONTS.bold },
  badgeDesc: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
});
