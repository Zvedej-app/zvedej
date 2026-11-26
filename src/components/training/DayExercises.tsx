import React, { useState } from 'react';
import { View } from 'react-native';
import { exerciseName } from '../../data/exercises';
import { uid } from '../../lib/id';
import { defaultPctOf, planWeek } from '../../lib/training';
import type { PlanDay, PlanExercise, SetScheme, TrainingPlan } from '../../lib/types';
import { ROUND_KG } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Button, Chip, Field, IconButton, Row, T } from '../ui';
import { ExercisePicker } from './ExercisePicker';
import { SchemeSheet } from './SchemeSheet';
import { schemeLabel } from './format';

/**
 * Seznam cviků jednoho tréninkového dne: klepnutím na „3 × 2 @ 70 %“ se otevře výběr
 * nástupů a opakování (kolečka). Používá se v editoru plánu i přímo v záložce Dnes.
 */
export function DayExercises({
  plan,
  day,
  onChange,
  showNotes,
}: {
  plan: TrainingPlan;
  day: PlanDay;
  onChange: (fn: (d: PlanDay) => PlanDay) => void;
  showNotes?: boolean;
}) {
  const { t, colors, settings } = useSettings();
  const training = useTraining();
  const week = planWeek(plan);
  const [picker, setPicker] = useState(false);
  const [edit, setEdit] = useState<{ exId: string; scheme: SetScheme | null } | null>(null);

  const patchEx = (exId: string, fn: (e: PlanExercise) => PlanExercise) =>
    onChange((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === exId ? fn(e) : e)) }));

  const move = (exId: string, dir: -1 | 1) =>
    onChange((d) => {
      const i = d.exercises.findIndex((e) => e.id === exId);
      const j = i + dir;
      if (j < 0 || j >= d.exercises.length) return d;
      const ex = [...d.exercises];
      [ex[i], ex[j]] = [ex[j], ex[i]];
      return { ...d, exercises: ex };
    });

  const editing = edit ? day.exercises.find((e) => e.id === edit.exId) : null;
  const fallback = editing
    ? {
        ...(editing.schemes.at(-1) ?? {
          sets: 3,
          reps: 3,
          load: { type: 'percent' as const, value: 70, of: defaultPctOf(editing.exerciseId) },
        }),
        id: '',
      }
    : null;

  return (
    <View style={{ gap: 4 }}>
      {day.exercises.length === 0 && (
        <T muted style={{ paddingVertical: 8 }}>
          {t('tr.noExercises')}
        </T>
      )}
      {day.exercises.map((e, idx) => (
        <View key={e.id} style={{ borderTopWidth: idx ? 1 : 0, borderTopColor: colors.border, paddingVertical: 12, gap: 8 }}>
          <Row>
            <T style={{ flex: 1, fontSize: 18, fontWeight: '800', lineHeight: 24 }}>
              {exerciseName(e.exerciseId, settings.lang, training.data.customExercises, e.customName)}
            </T>
            <IconButton name="arrow-up" size={18} onPress={() => move(e.id, -1)} />
            <IconButton name="arrow-down" size={18} onPress={() => move(e.id, 1)} />
            <IconButton
              name="close"
              size={20}
              color={colors.danger}
              onPress={() => onChange((d) => ({ ...d, exercises: d.exercises.filter((y) => y.id !== e.id) }))}
            />
          </Row>
          <Row style={{ flexWrap: 'wrap' }} gap={8}>
            {e.schemes.map((s) => (
              <Chip
                key={s.id}
                icon="create-outline"
                label={schemeLabel(s, training.data, plan, week, settings.unit, ROUND_KG)}
                onPress={() => setEdit({ exId: e.id, scheme: s })}
              />
            ))}
            <Chip icon="add" label={t('tr.addScheme')} onPress={() => setEdit({ exId: e.id, scheme: null })} />
          </Row>
          {showNotes && (
            <Field
              placeholder={`${t('tr.note')} (${t('common.optional')})`}
              value={e.note ?? ''}
              onChangeText={(note) => patchEx(e.id, (x) => ({ ...x, note }))}
            />
          )}
        </View>
      ))}
      <Button small kind="secondary" icon="add" title={t('tr.addExercise')} onPress={() => setPicker(true)} />

      <ExercisePicker
        visible={picker}
        onClose={() => setPicker(false)}
        onPick={(exerciseId) =>
          onChange((d) => ({
            ...d,
            exercises: [
              ...d.exercises,
              {
                id: uid('pe'),
                exerciseId,
                schemes: [
                  { id: uid('ss'), sets: 3, reps: 3, load: { type: 'percent', value: 70, of: defaultPctOf(exerciseId) } },
                ],
              },
            ],
          }))
        }
      />
      <SchemeSheet
        visible={!!edit}
        scheme={edit?.scheme ?? fallback}
        exerciseId={editing?.exerciseId ?? 'snatch'}
        onClose={() => setEdit(null)}
        onDelete={
          edit?.scheme
            ? () => patchEx(edit.exId, (e) => ({ ...e, schemes: e.schemes.filter((s) => s.id !== edit.scheme!.id) }))
            : undefined
        }
        onSave={(s) => {
          if (!edit) return;
          patchEx(edit.exId, (e) =>
            edit.scheme
              ? { ...e, schemes: e.schemes.map((x) => (x.id === edit.scheme!.id ? { ...s, id: x.id } : x)) }
              : { ...e, schemes: [...e.schemes, { ...s, id: uid('ss') }] },
          );
        }}
      />
    </View>
  );
}
