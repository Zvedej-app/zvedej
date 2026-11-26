import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { exerciseName } from '../../data/exercises';
import { ROUTINE_PRESETS, routineFromPreset } from '../../data/routines';
import type { Lang } from '../../lib/i18n';
import { FONTS } from '../../lib/theme';
import type { Routine, RoutineItem } from '../../lib/types';
import { formatNumber } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Button, PressScale, Row, Sheet, T } from '../ui';

/** Popis položky: „Overhead squat · 2 × 5 · 20 kg“ / „Kolo nebo veslo 5 min“. */
export function routineItemLabel(it: RoutineItem, lang: Lang, custom?: { id: string; name: string }[]) {
  const name = it.exerciseId ? exerciseName(it.exerciseId, lang, custom) : (it.text ?? '');
  const scheme = it.sets > 1 || it.reps > 1 ? `${it.sets} × ${it.reps}` : '';
  const kg = it.kg ? `${formatNumber(it.kg, 1)} kg` : '';
  return [name, scheme, kg].filter(Boolean).join(' · ');
}

/** Výběr rozcvičky / doplňků (moje uložené + předlohy). */
export function RoutinePickSheet({
  kind,
  visible,
  onClose,
  onPick,
  onNone,
  current,
}: {
  kind: Routine['kind'];
  visible: boolean;
  onClose: () => void;
  onPick: (r: Routine) => void;
  /** volba „Žádná“ (v plánu) */
  onNone?: () => void;
  current?: string | null;
}) {
  const { t, settings } = useSettings();
  const training = useTraining();
  const mine = (training.data.routines ?? []).filter((r) => r.kind === kind).sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  // předlohy, které už mám uložené (stejný název), znovu nenabízíme
  const presets = ROUTINE_PRESETS.filter((p) => p.kind === kind && !mine.some((r) => r.name === p.build(settings.lang).name));

  return (
    <Sheet visible={visible} onClose={onClose} title={kind === 'warmup' ? t('rt.pickWarmup') : t('rt.pickAccessory')} full>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 16 }}>
        {onNone ? <Button kind="ghost" icon="close-circle-outline" title={t('rt.none')} onPress={onNone} /> : null}
        {mine.map((r) => (
          <RoutineCard key={r.id} r={r} kind={kind} current={current} onPress={() => onPick(r)} />
        ))}
        {presets.length > 0 && (
          <T v="label" muted style={{ marginTop: 6 }}>
            {t('rt.presets')}
          </T>
        )}
        {presets.map((p) => {
          const built = p.build(settings.lang);
          return (
            <RoutineCard
              key={p.id}
              r={built}
              kind={kind}
              preset
              onPress={() => {
                // předloha se uloží mezi moje, ať ji jde příště upravit
                const r = routineFromPreset(p, settings.lang);
                training.saveRoutine(r);
                onPick(r);
              }}
            />
          );
        })}
        <View style={{ height: 4 }} />
        <Button
          kind="secondary"
          icon="create-outline"
          title={t('rt.manage')}
          onPress={() => {
            onClose();
            router.push('/routines');
          }}
        />
      </ScrollView>
    </Sheet>
  );
}

function RoutineCard({
  r,
  kind,
  current,
  onPress,
  preset,
}: {
  r: Pick<Routine, 'name' | 'items'>;
  kind: Routine['kind'];
  current?: string | null;
  onPress: () => void;
  preset?: boolean;
}) {
  const { t, settings, colors } = useSettings();
  const training = useTraining();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.98}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 14,
        gap: 4,
        borderWidth: current === r.name ? 2 : 1,
        borderColor: current === r.name ? colors.primary : colors.border,
      }}
    >
      <Row gap={8}>
        <Ionicons name={kind === 'warmup' ? 'body-outline' : 'add-circle-outline'} size={18} color={colors.primary} />
        <T style={{ flex: 1, fontFamily: FONTS.bold }}>{r.name}</T>
        {preset ? (
          <T v="caption" color={colors.primary} style={{ fontFamily: FONTS.bold }}>
            {t('rt.preset')}
          </T>
        ) : null}
      </Row>
      <T v="small" muted numberOfLines={2}>
        {r.items.map((it) => routineItemLabel(it, settings.lang, training.data.customExercises)).join(', ')}
      </T>
    </PressScale>
  );
}
