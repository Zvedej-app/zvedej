import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { exerciseName } from '../../data/exercises';
import { uid } from '../../lib/id';
import { lastWeightFor } from '../../lib/training';
import type { LoggedExercise } from '../../lib/types';
import { formatNumber, formatWeight } from '../../lib/units';
import { adjustUndone, exerciseSuggestion, heavier, lowReadiness } from '../../lib/suggest';
import { radius } from '../../lib/theme';
import { plural } from '../../lib/i18n';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Button, Card, IconButton, Row, T } from '../ui';
import { ExercisePicker } from './ExercisePicker';
import { SetSheet } from './SchemeSheet';

export function WorkoutEditor({
  exercises,
  onChange,
  onSetDone,
  suggestDate,
}: {
  exercises: LoggedExercise[];
  onChange: (ex: LoggedExercise[]) => void;
  onSetDone?: (loggedExId: string, setIndex: number) => void;
  /** datum rozpracovaného tréninku – zapne návrhy vah podle minulého tréninku */
  suggestDate?: string;
}) {
  const { t, colors, settings, tap } = useSettings();
  const { data } = useTraining();
  const [edit, setEdit] = useState<{ exId: string; i: number } | null>(null);
  const [picker, setPicker] = useState(false);
  // návrhy, které uživatel použil nebo zavřel
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const patchEx = (exId: string, fn: (e: LoggedExercise) => LoggedExercise) =>
    onChange(exercises.map((e) => (e.id === exId ? fn(e) : e)));

  const editing = edit ? exercises.find((e) => e.id === edit.exId) : null;
  const editingSet = editing && edit ? editing.sets[edit.i] : null;

  return (
    <View style={{ gap: 12 }}>
      {exercises.map((e) => {
        const name = exerciseName(e.exerciseId, settings.lang, data.customExercises, e.customName);
        const doneCount = e.sets.filter((s) => s.done).length;
        return (
          <Card key={e.id}>
            <Row>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 19, fontWeight: '800', lineHeight: 25 }}>{name}</T>
                <T v="caption" muted>
                  {doneCount}/{plural(settings.lang, 'set', e.sets.length)}
                  {e.note ? ` · ${e.note}` : ''}
                </T>
              </View>
              {/* rychlé odškrtnutí všech nástupů cviku (např. když se zapisuje až po tréninku) */}
              {e.sets.length > 0 && doneCount < e.sets.length && (
                <IconButton
                  name="checkmark-done"
                  size={22}
                  color={colors.success}
                  label={t('ql.tickAll')}
                  onPress={() => {
                    tap('success');
                    patchEx(e.id, (x) => ({ ...x, sets: x.sets.map((st) => ({ ...st, done: true })) }));
                  }}
                />
              )}
              <IconButton
                name="trash-outline"
                size={20}
                color={colors.textMuted}
                onPress={() => onChange(exercises.filter((x) => x.id !== e.id))}
              />
            </Row>
            {suggestDate && !dismissed.has(e.id)
              ? (() => {
                  const sug = exerciseSuggestion(data, e, suggestDate);
                  // při nízké připravenosti nepřidáváme
                  if (!sug || (sug.kind === 'up' && lowReadiness(data, suggestDate) !== null)) return null;
                  const close = () => setDismissed((d) => new Set(d).add(e.id));
                  return (
                    <Row
                      gap={8}
                      style={{
                        backgroundColor: sug.kind === 'up' ? colors.primarySoft : colors.surface,
                        borderRadius: 12,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                      }}
                    >
                      <Ionicons
                        name={sug.kind === 'up' ? 'trending-up' : 'pause-circle-outline'}
                        size={18}
                        color={sug.kind === 'up' ? colors.success : colors.textMuted}
                      />
                      <T v="small" style={{ flex: 1 }}>
                        {sug.kind === 'up'
                          ? t('sug.up', { rpe: sug.rpe ?? '—', kg: formatWeight(sug.lastKg, settings.unit) })
                          : t('sug.hold', { kg: formatWeight(sug.lastKg, settings.unit) })}
                      </T>
                      {sug.kind === 'up' && (
                        <Button
                          small
                          title={`+${formatNumber(sug.deltaKg, 1)} kg`}
                          onPress={() => {
                            tap('success');
                            patchEx(e.id, (x) => adjustUndone(x, heavier));
                            close();
                          }}
                        />
                      )}
                      <IconButton name="close" size={18} color={colors.textMuted} label={t('common.close')} onPress={close} />
                    </Row>
                  );
                })()
              : null}
            {e.sets.map((s, i) => (
              <Row
                key={i}
                style={[styles.setRow, { backgroundColor: s.done ? colors.primarySoft : colors.bg, borderColor: colors.border }]}
              >
                <T v="small" muted style={{ width: 26 }}>
                  {i + 1}.
                </T>
                <Pressable style={{ flex: 1 }} onPress={() => setEdit({ exId: e.id, i })}>
                  <Row gap={6}>
                    <T v="h3" style={{ fontVariant: ['tabular-nums'] }}>
                      {s.reps} ×
                    </T>
                    <T v="h3" color={colors.primary} style={{ fontVariant: ['tabular-nums'] }}>
                      {formatWeight(s.kg, settings.unit)}
                    </T>
                    <Ionicons name="create-outline" size={14} color={colors.textMuted} />
                  </Row>
                </Pressable>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: s.done }}
                  hitSlop={8}
                  onPress={() => {
                    tap(s.done ? 'light' : 'success');
                    patchEx(e.id, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === i ? { ...y, done: !y.done } : y)) }));
                    if (!s.done) onSetDone?.(e.id, i);
                  }}
                  style={[
                    styles.check,
                    { borderColor: colors.primary, backgroundColor: s.done ? colors.primary : 'transparent' },
                  ]}
                >
                  {s.done && <Ionicons name="checkmark" size={20} color="#FFF" />}
                </Pressable>
              </Row>
            ))}
            <Button
              small
              kind="ghost"
              icon="add"
              title={t('tr.addSet')}
              onPress={() =>
                patchEx(e.id, (x) => {
                  const last = x.sets.at(-1) ?? { reps: 3, kg: lastWeightFor(data, x.exerciseId) ?? 20, done: false };
                  return { ...x, sets: [...x.sets, { ...last, done: false }] };
                })
              }
            />
          </Card>
        );
      })}
      <Button kind="secondary" icon="add" title={t('tr.addExercise')} onPress={() => setPicker(true)} />

      <ExercisePicker
        visible={picker}
        onClose={() => setPicker(false)}
        onPick={(exerciseId) =>
          onChange([
            ...exercises,
            {
              id: uid('le'),
              exerciseId,
              sets: [{ reps: 3, kg: lastWeightFor(data, exerciseId) ?? 20, done: false }],
            },
          ])
        }
      />
      <SetSheet
        visible={!!editingSet}
        title={
          editing
            ? `${exerciseName(editing.exerciseId, settings.lang, data.customExercises, editing.customName)} · ${t('tr.setN')} ${(edit?.i ?? 0) + 1}`
            : ''
        }
        reps={editingSet?.reps ?? 1}
        kg={editingSet?.kg ?? 0}
        onClose={() => setEdit(null)}
        onSave={(reps, kg) =>
          edit &&
          patchEx(edit.exId, (x) => ({
            ...x,
            // změna váhy se propíše i do dalších nezapsaných sérií
            sets: x.sets.map((y, j) =>
              j === edit.i ? { ...y, reps, kg } : j > edit.i && !y.done && y.kg === x.sets[edit.i].kg ? { ...y, kg } : y,
            ),
          }))
        }
        onDelete={() => edit && patchEx(edit.exId, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== edit.i) }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  setRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  check: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
