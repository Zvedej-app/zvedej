import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { copyRoutine } from '../../lib/training';
import { FONTS } from '../../lib/theme';
import type { PlanDay } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';
import { T } from '../ui';
import { RoutinePickSheet } from './RoutineSheet';

/** V editoru plánu: rozcvička a doplňky ke dni (uloží se kopie, takže je uvidí i svěřenec). */
export function DayRoutines({ day, onChange }: { day: PlanDay; onChange: (fn: (d: PlanDay) => PlanDay) => void }) {
  const { t, colors } = useSettings();
  const [pick, setPick] = useState<'warmup' | 'accessory' | null>(null);
  const row = (kind: 'warmup' | 'accessory') => {
    const r = kind === 'warmup' ? day.warmup : day.accessories;
    return (
      <Pressable
        key={kind}
        accessibilityRole="button"
        onPress={() => setPick(kind)}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          padding: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderStyle: r ? 'solid' : 'dashed',
          borderColor: r ? colors.primary : colors.border,
          backgroundColor: r ? colors.primarySoft : 'transparent',
        }}
      >
        <Ionicons name={kind === 'warmup' ? 'body-outline' : 'add-circle-outline'} size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <T v="caption" muted>
            {kind === 'warmup' ? t('rt.dayWarmup') : t('rt.dayAccessory')}
          </T>
          <T v="small" style={{ fontFamily: FONTS.bold }} numberOfLines={1}>
            {r ? r.name : t('rt.noneShort')}
          </T>
        </View>
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {row('warmup')}
      {row('accessory')}
      <RoutinePickSheet
        kind={pick ?? 'warmup'}
        visible={pick !== null}
        current={pick === 'warmup' ? day.warmup?.name : day.accessories?.name}
        onClose={() => setPick(null)}
        onNone={() => {
          onChange((d) => (pick === 'warmup' ? { ...d, warmup: null } : { ...d, accessories: null }));
          setPick(null);
        }}
        onPick={(r) => {
          const c = copyRoutine(r);
          onChange((d) => (pick === 'warmup' ? { ...d, warmup: c } : { ...d, accessories: c }));
          setPick(null);
        }}
      />
    </View>
  );
}
