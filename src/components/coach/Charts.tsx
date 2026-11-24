import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { formatDate } from '../../lib/date';
import { useSettings } from '../../providers/SettingsProvider';
import { T } from '../ui';

const H = 150;

/** Čárový graf vývoje váhy (nejtěžší nástup v tréninku). */
export function LiftChart({ points, unitLabel }: { points: { date: string; kg: number }[]; unitLabel: string }) {
  const { colors, locale } = useSettings();
  const [w, setW] = useState(0);
  if (!points.length) return null;
  const min = Math.min(...points.map((p) => p.kg));
  const max = Math.max(...points.map((p) => p.kg));
  const lo = Math.floor(min - Math.max(2, (max - min) * 0.15));
  const hi = Math.ceil(max + Math.max(2, (max - min) * 0.15));
  const padX = 8;
  const x = (i: number) => (points.length === 1 ? w / 2 : padX + (i / (points.length - 1)) * (w - padX * 2));
  const y = (kg: number) => 8 + (1 - (kg - lo) / (hi - lo || 1)) * (H - 16);
  const last = points[points.length - 1];
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="caption" muted>
          max {max} {unitLabel}
        </T>
        <T v="caption" muted>
          {formatDate(last.date, locale, { day: 'numeric', month: 'numeric' })}:{' '}
          <T v="caption" style={{ fontWeight: '800' }}>
            {last.kg} {unitLabel}
          </T>
        </T>
      </View>
      <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <Svg width={w} height={H}>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line key={f} x1={0} x2={w} y1={H * f} y2={H * f} stroke={colors.border} strokeWidth={1} strokeDasharray="4 4" />
            ))}
            <Polyline
              points={points.map((p, i) => `${x(i)},${y(p.kg)}`).join(' ')}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <Circle
                key={i}
                cx={x(i)}
                cy={y(p.kg)}
                r={p.kg === max ? 5 : 3}
                fill={p.kg === max ? colors.accent : colors.primary}
              />
            ))}
          </Svg>
        )}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T v="caption" muted>
          {formatDate(points[0].date, locale, { day: 'numeric', month: 'numeric' })}
        </T>
        <T v="caption" muted>
          {formatDate(last.date, locale, { day: 'numeric', month: 'numeric' })}
        </T>
      </View>
    </View>
  );
}

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
            {b.label}
          </T>
        ))}
      </View>
    </View>
  );
}
