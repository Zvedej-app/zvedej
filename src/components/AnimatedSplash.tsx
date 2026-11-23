import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BLUE } from '../lib/theme';
import { BarbellHalf } from './Logo';

/**
 * Úvodní obrazovka při načítání: název aplikace Zvedej, logo činky
 * a dole „By Sladký&Vejvoda“. Zobrazí se minimálně ~2,6 s a pak plynule zmizí.
 */
/** minimální doba zobrazení (ms) */
const MIN_MS = 2600;

export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // velikost poloviny činky podle šířky displeje (uprostřed je nápis Zvedej)
  const titleW = 170;
  const half = Math.min(130, Math.max(70, (width - 40 - titleW) / 2));
  const [lift] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [text] = useState(() => new Animated.Value(0));
  const [started] = useState(() => Date.now());

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(lift, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(150),
        Animated.timing(lift, { toValue: 0, duration: 550, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.delay(120),
      ]),
    ).start();
    Animated.timing(text, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }).start();
  }, [lift, text]);

  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(0, MIN_MS - (Date.now() - started));
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => onDone());
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, fade, onDone, started]);

  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [14, -22] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100 }]} pointerEvents={ready ? 'none' : 'auto'}>
      <LinearGradient colors={[BLUE[500], BLUE[600], BLUE[800]]} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        {/* činka jako na závodech: nápis Zvedej je v prostoru mezi kotouči */}
        <Animated.View style={[styles.barbell, { transform: [{ translateY }] }]}>
          <BarbellHalf height={half} />
          <View style={[styles.titleWrap, { width: titleW }]}>
            <View style={styles.barBehind} />
            <Animated.Text style={[styles.title, { opacity: text }]} numberOfLines={1}>
              Zvedej
            </Animated.Text>
          </View>
          <BarbellHalf height={half} flip />
        </Animated.View>
        <View style={[styles.floor, { width: half * 2 + titleW }]} />
      </View>
      <View style={[styles.byWrap, { bottom: insets.bottom + 64 }]}>
        <Text style={styles.byWord}>By</Text>
        <Text style={styles.by}>{'Sladký&Vejvoda'}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  barbell: { flexDirection: 'row', alignItems: 'center' },
  titleWrap: { alignItems: 'center', justifyContent: 'center' },
  // osa pokračuje i pod nápisem, nápis má kolem sebe pozadí, aby byl čitelný
  barBehind: { position: 'absolute', left: -2, right: -2, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  floor: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 18 },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0.3,
    paddingHorizontal: 6,
    textShadowColor: 'rgba(5,15,46,0.55)',
    textShadowRadius: 8,
  },
  byWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 2 },
  byWord: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', letterSpacing: 1.2, textAlign: 'center' },
  by: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '700', letterSpacing: 1.2, textAlign: 'center' },
});
