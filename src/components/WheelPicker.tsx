import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
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
}: {
  values: V[];
  value: V;
  onChange: (v: V) => void;
  format?: (v: V) => string;
  label?: string;
  width?: number;
}) {
  const { colors, settings } = useSettings();
  const ref = useRef<FlatList<V>>(null);
  const initial = Math.max(0, values.indexOf(value));
  const [cur, setCur] = useState(initial);
  const curRef = useRef(initial);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const i = Math.min(values.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM_H)));
    if (i !== curRef.current) {
      curRef.current = i;
      setCur(i);
      if (settings.haptics && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    }
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => commit(curRef.current), 160);
  };

  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
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
      <View style={{ height: ITEM_H * VISIBLE, width }}>
        <View
          pointerEvents="none"
          style={[styles.band, { top: ITEM_H * 2, backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
        />
        <FlatList
          ref={ref}
          data={values}
          keyExtractor={(v, i) => `${v}-${i}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          initialScrollIndex={initial}
          getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
          contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => commit(Math.round(e.nativeEvent.contentOffset.y / ITEM_H))}
          windowSize={7}
          initialNumToRender={15}
          renderItem={({ item, index }) => {
            const d = Math.abs(index - cur);
            return (
              <Pressable
                onPress={() => ref.current?.scrollToOffset({ offset: index * ITEM_H, animated: true })}
                style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
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
