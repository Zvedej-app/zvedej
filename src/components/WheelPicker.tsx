import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { webTick } from '../lib/tick';
import { useSettings } from '../providers/SettingsProvider';
import { T } from './ui';

export const ITEM_H = 44;
const VISIBLE = 5;

/**
 * Rolovací výběr čísla (jako kolečko v iOS). Funguje na iOS, Androidu i webu.
 */
export function Wheel<V extends string | number>({
  values,
  value,
  onChange,
  format = (v) => String(v),
  label,
  width = 90,
  rows = VISIBLE,
}: {
  values: V[];
  value: V;
  onChange: (v: V) => void;
  format?: (v: V) => string;
  label?: string;
  width?: number;
  /** počet viditelných řádků (liché číslo), výchozí 5 */
  rows?: number;
}) {
  const pad = ITEM_H * Math.floor(rows / 2);
  const { colors, settings } = useSettings();
  const ref = useRef<FlatList<V>>(null);
  const initial = Math.max(0, values.indexOf(value));
  const [cur, setCur] = useState(initial);
  const curRef = useRef(initial);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offsets = useMemo(() => values.map((_, i) => i * ITEM_H), [values]);

  // když se hodnota změní zvenku, posuň kolečko
  useEffect(() => {
    const i = values.indexOf(value);
    if (i >= 0 && i !== curRef.current) {
      curRef.current = i;
      setCur(i);
      ref.current?.scrollToOffset({ offset: i * ITEM_H, animated: false });
    }
  }, [value, values]);

  const commit = useCallback(
    (i: number) => {
      const clamped = Math.min(values.length - 1, Math.max(0, i));
      if (values[clamped] !== value) onChange(values[clamped]);
    },
    [values, value, onChange],
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM_H)));
    if (i !== curRef.current) {
      curRef.current = i;
      setCur(i);
      if (settings.haptics) {
        if (Platform.OS === 'web') webTick();
        else Haptics.selectionAsync().catch(() => {});
      }
    }
    // po doznění pohybu číslo přesně ukotvíme do středu výběru a teprve pak uložíme
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const target = curRef.current * ITEM_H;
      if (Math.abs(y - target) > 0.5) ref.current?.scrollToOffset({ offset: target, animated: true });
      commit(curRef.current);
    }, 110);
  };

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  return (
    <View style={{ width, alignItems: 'center' }}>
      {label && (
        <T v="label" muted style={{ marginBottom: 6 }} numberOfLines={1}>
          {label}
        </T>
      )}
      <View style={{ height: ITEM_H * rows, width }}>
        <View
          pointerEvents="none"
          style={[styles.band, { top: pad, backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
        />
        <FlatList
          ref={ref}
          data={values}
          keyExtractor={(v, i) => `${v}-${i}`}
          showsVerticalScrollIndicator={false}
          snapToOffsets={offsets}
          snapToAlignment="start"
          decelerationRate="fast"
          initialScrollIndex={initial}
          getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
          contentContainerStyle={{ paddingVertical: pad }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={webSnap(pad)}
          windowSize={7}
          initialNumToRender={15}
          renderItem={({ item, index }) => {
            const d = Math.abs(index - cur);
            return (
              <Pressable
                onPress={() => ref.current?.scrollToOffset({ offset: index * ITEM_H, animated: true })}
                style={[{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }, webSnapItem]}
              >
                <Text
                  style={{
                    fontSize: d === 0 ? 22 : 18,
                    fontWeight: d === 0 ? '800' : '500',
                    color: d === 0 ? colors.primary : colors.textMuted,
                    opacity: d === 0 ? 1 : d === 1 ? 0.75 : 0.4,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {format(item)}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

// Na webu zajistí přesné ukotvení čísla CSS scroll-snap (prohlížeč „zacvakne“ vždy na číslo).
const webSnap = (pad: number) =>
  (Platform.OS === 'web' ? { scrollSnapType: 'y mandatory', scrollPaddingTop: pad } : undefined) as StyleProp<ViewStyle>;
const webSnapItem = (Platform.OS === 'web' ? { scrollSnapAlign: 'start' } : undefined) as StyleProp<ViewStyle>;

export function range(from: number, to: number, step = 1) {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: ITEM_H,
    borderRadius: 10,
    borderWidth: 1,
    opacity: 0.9,
  },
});
