import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useBottomInset } from '../lib/insets';
import { BLUE } from '../lib/theme';
import { BarbellHalf } from './Logo';

/**
 * Úvodní obrazovka při načítání: název aplikace Zvedej, logo činky
 * a dole „By Sladký&Vejvoda“. Činka se zvedá a dopadá na zem; aplikace se otevře
 * až po druhém dopadu (a jen pokud je už načtená – jinak po dalším dopadu).
 */
/** po kolikátém dopadu se aplikace otevře */
const LANDINGS = 2;

export function AnimatedSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const bottomInset = useBottomInset();
  const { width } = useWindowDimensions();
  // velikost poloviny činky podle šířky displeje (uprostřed je nápis Zvedej)
  // na úzkých displejích se mezera i nápis zmenší, aby se činka vešla
  const titleW = Math.max(130, Math.min(196, width - 40 - 140));
  const half = Math.min(130, Math.max(70, (width - 40 - titleW) / 2));
  const titleSize = Math.round(titleW * 0.225);
  // tloušťka osy stejná jako v kresbě konců činky (8 z 120)
  const barH = (half * 8) / 120;
  const [lift] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [text] = useState(() => new Animated.Value(0));
  const readyRef = useRef(ready);
  const doneRef = useRef(onDone);
  useEffect(() => {
    readyRef.current = ready;
    doneRef.current = onDone;
  }, [ready, onDone]);

  useEffect(() => {
    let alive = true;
    let landings = 0;
    // jeden zdvih: nahoru, krátká výdrž, pád na zem
    const rep = () => {
      Animated.sequence([
        Animated.timing(lift, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(150),
        Animated.timing(lift, { toValue: 0, duration: 550, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (!alive || !finished) return;
        landings += 1;
        if (landings >= LANDINGS && readyRef.current) {
          // činka dopadla podruhé – chvilku leží na zemi a obrazovka zmizí
          Animated.timing(fade, { toValue: 0, duration: 380, delay: 120, useNativeDriver: true }).start(() => doneRef.current());
          return;
        }
        setTimeout(() => alive && rep(), 120);
      });
    };
    rep();
    Animated.timing(text, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }).start();
    return () => {
      alive = false;
    };
  }, [lift, text, fade]);

  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [14, -22] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 100 }]} pointerEvents={ready ? 'none' : 'auto'}>
      <LinearGradient colors={[BLUE[500], BLUE[600], BLUE[800]]} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        {/* činka jako na závodech: nápis Zvedej je v prostoru mezi kotouči */}
        <Animated.View style={[styles.barbell, { transform: [{ translateY }] }]}>
          <BarbellHalf height={half} />
          <View style={[styles.titleWrap, { width: titleW, height: half }]}>
            <View style={[styles.barBehind, { height: barH, borderRadius: barH / 2 }]} />
            {/* nápis je kousek nad osou */}
            <Animated.Text style={[styles.title, { opacity: text, bottom: half / 2 + 6, fontSize: titleSize, lineHeight: titleSize + 4 }]} numberOfLines={1}>
              Zvedej
            </Animated.Text>
          </View>
          <BarbellHalf height={half} flip />
        </Animated.View>
        <View style={[styles.floor, { width: half * 2 + titleW }]} />
      </View>
      <Text style={[styles.byWord, styles.byWrap, { bottom: bottomInset + 86 }]}>By</Text>
      <Text style={[styles.by, styles.byWrap, { bottom: bottomInset + 40 }]}>{'Sladký&Vejvoda'}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  barbell: { flexDirection: 'row', alignItems: 'center' },
  titleWrap: { alignItems: 'center', justifyContent: 'center' },
  // střední část osy mezi kotouči (nápis je nad ní)
  barBehind: { position: 'absolute', left: -1, right: -1, backgroundColor: '#FFFFFF' },
  floor: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 18 },
  title: {
    color: '#FFFFFF',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(5,15,46,0.55)',
    textShadowRadius: 8,
  },
  byWrap: { position: 'absolute', left: 0, right: 0 },
  byWord: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '300', letterSpacing: 1.2, textAlign: 'center' },
  by: { color: 'rgba(255,255,255,0.92)', fontSize: 16, fontWeight: '300', letterSpacing: 1.2, textAlign: 'center' },
});
