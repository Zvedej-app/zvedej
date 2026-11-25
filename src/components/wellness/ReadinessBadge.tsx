import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { TKey } from '../../lib/i18n';
import { FONTS } from '../../lib/theme';
import { readinessLevel } from '../../lib/wellness';
import { useSettings } from '../../providers/SettingsProvider';
import { T } from '../ui';

/** Kroužek připravenosti 0–100 (zelená / oranžová / červená) */
export function ReadinessRing({ score, size = 64 }: { score: number; size?: number }) {
  const { colors } = useSettings();
  const lvl = readinessLevel(score);
  const color = lvl === 'good' ? colors.success : lvl === 'ok' ? '#F59E0B' : colors.accent;
  const stroke = Math.max(5, size / 10);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </Svg>
      <T style={{ fontFamily: FONTS.black, fontSize: size * 0.3 }}>{score}</T>
    </View>
  );
}

export function readinessText(score: number, t: (k: TKey) => string) {
  return t(`well.level.${readinessLevel(score)}` as TKey);
}
