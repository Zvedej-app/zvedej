import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useSettings } from '../../providers/SettingsProvider';
import { T } from '../ui';

const H = 150;

/** Sloupcový graf (tonáž po týdnech). */
export function BarChart({ bars, format }: { bars: { label: string; value: number }[]; format: (v: number) => string }) {
  const { colors } = useSettings();
  const [w, setW] = useState(0);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const gap = 6;
  const bw = w ? (w - gap * (bars.length - 1)) / bars.length : 0;
  return (
    <View style={{ gap: 6 }}>
      <T v="caption" muted>
        max {format(max)}
      </T>
      <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <Svg width={w} height={H}>
            {bars.map((b, i) => {
              const h = Math.max(b.value ? 4 : 0, (b.value / max) * (H - 4));
              return (
                <Rect
                  key={i}
                  x={i * (bw + gap)}
                  y={H - h}
                  width={bw}
                  height={h}
                  rx={5}
                  fill={i === bars.length - 1 ? colors.accent : colors.primary}
                  opacity={b.value ? 1 : 0.2}
                />
              );
            })}
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap }}>
        {bars.map((b, i) => (
          <T key={i} v="caption" muted style={{ flex: 1, textAlign: 'center', fontSize: 10 }} numberOfLines={1}>
            {/* u hodně sloupců jen každý třetí popisek, aby se vešly */}
            {bars.length <= 8 || (bars.length - 1 - i) % 3 === 0 ? b.label : ''}
          </T>
        ))}
      </View>
    </View>
  );
}
