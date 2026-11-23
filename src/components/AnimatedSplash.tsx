import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BLUE } from '../lib/theme';
import { BarbellLogo } from './Logo';

/**
 * Úvodní obrazovka při načítání: název aplikace Zvedej, logo činky
 * a dole „By Sladký&Vejvoda“. Zobrazí se minimálně ~2,6 s a pak plynule zmizí.
 */
/** minimální doba zobrazení (ms) */
const MIN_MS = 2600;

export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
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

  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [18, -26] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100 }]} pointerEvents={ready ? 'none' : 'auto'}>
      <LinearGradient colors={[BLUE[500], BLUE[600], BLUE[800]]} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          <BarbellLogo size={190} color="#FFFFFF" accent="#E8353B" />
        </Animated.View>
        <View style={styles.floor} />
        <Animated.Text
          style={[
            styles.title,
            { opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
          ]}
        >
          Zvedej
        </Animated.Text>
      </View>
      <View style={[styles.byWrap, { bottom: insets.bottom + 28 }]}>
        <Text style={styles.byWord}>By</Text>
        <Text style={styles.by}>{'Sladký&Vejvoda'}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  floor: { width: 200, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 10 },
  title: { color: '#FFFFFF', fontSize: 52, fontWeight: '900', letterSpacing: 1, marginTop: 26 },
  byWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 2 },
  byWord: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', letterSpacing: 1.2, textAlign: 'center' },
  by: { color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: '700', letterSpacing: 1.2, textAlign: 'center' },
});
