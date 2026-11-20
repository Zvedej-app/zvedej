import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ExercisePicker } from '../../components/training/ExercisePicker';
import { schemeLabel } from '../../components/training/format';
import { SchemeSheet } from '../../components/training/SchemeSheet';
import { Button, Card, Chip, Field, Header, IconButton, ListItem, Row, Screen, Sheet, T } from '../../components/ui';
import { range, Wheel } from '../../components/WheelPicker';
import { exerciseName } from '../../data/exercises';
import { newPlan } from '../../data/templates';
import { addDays, formatDate, nextMonday, parseISODate, toISODate, todayISO, startOfWeek } from '../../lib/date';
import { confirm } from '../../lib/dialog';
import { uid } from '../../lib/id';
import { defaultPctOf, planWeek } from '../../lib/training';
import type { PlanDay, PlanExercise, SetScheme, TrainingPlan } from '../../lib/types';
import { formatNumber } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';

const WEEKS: (number | 0)[] = [0, ...range(1, 24)];
const INCREMENTS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

export default function PlanEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors, settings, locale } = useSettings();
  const training = useTraining();
  const existing = training.data.plans.find((p) => p.id === id) ?? null;
  const [plan, setPlan] = useState<TrainingPlan>(() => existing ?? newPlan({ name: '' }));
  const [pickerFor, setPickerFor] = useState<string | null>(null); // dayId
  const [schemeEdit, setSchemeEdit] = useState<{ dayId: string; exId: string; scheme: SetScheme | null } | null>(null);
  const [sheet, setSheet] = useState<'weeks' | 'inc' | null>(null);
  const today = todayISO();
  const isRunning = plan.status === 'active' && plan.startDate <= today && (!plan.endDate || plan.endDate >= today);
  const week = planWeek(plan);

  const patch = (p: Partial<TrainingPlan>) => setPlan((x) => ({ ...x, ...p }));
  const patchDay = (dayId: string, fn: (d: PlanDay) => PlanDay) =>
    setPlan((x) => ({ ...x, days: x.days.map((d) => (d.id === dayId ? fn(d) : d)) }));
  const patchEx = (dayId: string, exId: string, fn: (e: PlanExercise) => PlanExercise) =>
    patchDay(dayId, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === exId ? fn(e) : e)) }));

  const addDay = () => {
    const used = new Set(plan.days.flatMap((d) => d.weekdays));
    const free = [0, 2, 4, 1, 3, 5, 6].find((w) => !used.has(w));
    const n = plan.days.length + 1;
    setPlan((x) => ({
      ...x,
      days: [
        ...x.days,
        {
          id: uid('pd'),
          name: `${settings.lang === 'en' ? 'Day' : settings.lang === 'sk' ? 'Deň' : 'Den'} ${String.fromCharCode(64 + n)}`,
          weekdays: free !== undefined ? [free] : [],
          exercises: [],
        },
      ],
    }));
  };

  const moveEx = (dayId: string, exId: string, dir: -1 | 1) =>
    patchDay(dayId, (d) => {
      const i = d.exercises.findIndex((e) => e.id === exId);
      const j = i + dir;
      if (j < 0 || j >= d.exercises.length) return d;
      const ex = [...d.exercises];
      [ex[i], ex[j]] = [ex[j], ex[i]];
      return { ...d, exercises: ex };
    });

  const save = () => {
    const final = { ...plan, name: plan.name.trim() || t('tr.newPlan') };
    training.savePlan(final);
    return final;
  };

  const editingEx = useMemo(() => {
    if (!schemeEdit) return null;
    return plan.days.find((d) => d.id === schemeEdit.dayId)?.exercises.find((e) => e.id === schemeEdit.exId) ?? null;
  }, [schemeEdit, plan]);

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={existing ? t('tr.editPlan') : t('tr.newPlan')}
        right={
          <Button
            small
            title={t('common.save')}
            onPress={() => {
              save();
              router.back();
            }}
          />
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <Field
            label={t('tr.planName')}
            placeholder={t('tr.planNamePh')}
            value={plan.name}
            onChangeText={(name) => patch({ name })}
          />

          <Card>
            <T v="label" muted>
              {t('tr.startDate')}
            </T>
            <Row style={{ justifyContent: 'space-between' }}>
              <IconButton
                name="chevron-back-circle-outline"
                onPress={() => patch({ startDate: toISODate(addDays(parseISODate(plan.startDate), -1)) })}
              />
              <T v="h3">
                {formatDate(plan.startDate, locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </T>
              <IconButton
                name="chevron-forward-circle-outline"
                onPress={() => patch({ startDate: toISODate(addDays(parseISODate(plan.startDate), 1)) })}
              />
            </Row>
            <Row style={{ flexWrap: 'wrap' }} gap={6}>
              <Chip label={t('common.today')} on={plan.startDate === today} onPress={() => patch({ startDate: today })} />
              <Chip
                label={formatDate(toISODate(startOfWeek(new Date())), locale, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'numeric',
                })}
                on={plan.startDate === toISODate(startOfWeek(new Date()))}
                onPress={() => patch({ startDate: toISODate(startOfWeek(new Date())) })}
              />
              <Chip
                label={formatDate(toISODate(nextMonday()), locale, { weekday: 'short', day: 'numeric', month: 'numeric' })}
                on={plan.startDate === toISODate(nextMonday())}
                onPress={() => patch({ startDate: toISODate(nextMonday()) })}
              />
            </Row>
            <ListItem
              icon="time-outline"
              title={t('tr.blockLength')}
              value={plan.weeks ? `${plan.weeks} ${t('common.weeks')}` : t('tr.unlimited')}
              onPress={() => setSheet('weeks')}
            />
            <ListItem
              icon="trending-up-outline"
              title={t('tr.progression')}
              subtitle={t('tr.progressionHint')}
              value={plan.weeklyIncrementPct ? `+${formatNumber(plan.weeklyIncrementPct)} %` : '0 %'}
              onPress={() => setSheet('inc')}
            />
          </Card>

          <T v="label" muted>
            {t('tr.days')}
          </T>
          {plan.days.map((d) => (
            <Card key={d.id}>
              <Row>
                <Field
                  value={d.name}
                  onChangeText={(name) => patchDay(d.id, (x) => ({ ...x, name }))}
                  style={{ flex: 1 }}
                  placeholder={t('tr.dayName')}
                />
                <IconButton
                  name="trash-outline"
                  color={colors.danger}
                  label={t('common.delete')}
                  onPress={async () => {
                    if (
                      d.exercises.length &&
                      !(await confirm(t('common.confirmDelete'), {
                        ok: t('common.delete'),
                        cancel: t('common.cancel'),
                        destructive: true,
                      }))
                    )
                      return;
                    setPlan((x) => ({ ...x, days: x.days.filter((y) => y.id !== d.id) }));
                  }}
                />
              </Row>
              <Row gap={4} style={{ justifyContent: 'space-between' }}>
                {[0, 1, 2, 3, 4, 5, 6].map((w) => {
                  const on = d.weekdays.includes(w);
                  return (
                    <Chip
                      key={w}
                      label={t(`tr.weekday.${w}` as any)}
                      on={on}
                      onPress={() =>
                        patchDay(d.id, (x) => ({
                          ...x,
                          weekdays: on ? x.weekdays.filter((y) => y !== w) : [...x.weekdays, w].sort(),
                        }))
                      }
                    />
                  );
                })}
              </Row>

              {d.exercises.map((e, idx) => (
                <View key={e.id} style={{ borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 10, gap: 6 }}>
                  <Row>
                    <T style={{ flex: 1, fontWeight: '700' }}>
                      {idx + 1}. {exerciseName(e.exerciseId, settings.lang, training.data.customExercises, e.customName)}
                    </T>
                    <IconButton name="arrow-up" size={18} onPress={() => moveEx(d.id, e.id, -1)} />
                    <IconButton name="arrow-down" size={18} onPress={() => moveEx(d.id, e.id, 1)} />
                    <IconButton
                      name="close"
                      size={20}
                      color={colors.danger}
                      onPress={() => patchDay(d.id, (x) => ({ ...x, exercises: x.exercises.filter((y) => y.id !== e.id) }))}
                    />
                  </Row>
                  <Row style={{ flexWrap: 'wrap' }} gap={6}>
                    {e.schemes.map((s) => (
                      <Chip
                        key={s.id}
                        icon="create-outline"
                        label={schemeLabel(s, training.data, plan, week, settings.unit, settings.roundingKg)}
                        onPress={() => setSchemeEdit({ dayId: d.id, exId: e.id, scheme: s })}
                      />
                    ))}
                    <Chip
                      icon="add"
                      label={t('tr.addScheme')}
                      onPress={() => setSchemeEdit({ dayId: d.id, exId: e.id, scheme: null })}
                    />
                  </Row>
                  <Field
                    placeholder={`${t('tr.note')} (${t('common.optional')})`}
                    value={e.note ?? ''}
                    onChangeText={(note) => patchEx(d.id, e.id, (x) => ({ ...x, note }))}
                  />
                </View>
              ))}
              <Button small kind="secondary" icon="add" title={t('tr.addExercise')} onPress={() => setPickerFor(d.id)} />
            </Card>
          ))}
          <Button kind="secondary" icon="calendar-outline" title={t('tr.addDay')} onPress={addDay} />

          {existing && (
            <View style={{ gap: 10, marginTop: 10 }}>
              {!isRunning && (
                <Button
                  icon="play-outline"
                  title={t('tr.activate')}
                  onPress={() => {
                    const p = save();
                    training.activatePlan(p.id);
                    router.back();
                  }}
                />
              )}
              {isRunning && (
                <>
                  <Button
                    kind="secondary"
                    icon="git-branch-outline"
                    title={t('tr.changeFromNextWeek')}
                    onPress={async () => {
                      if (!(await confirm(t('tr.changeHint'), { ok: t('common.yes'), cancel: t('common.cancel') }))) return;
                      save();
                      const nid = training.changeFromNextWeek(plan.id);
                      router.replace(`/plan/${nid}`);
                    }}
                  />
                  <T v="caption" muted>
                    {t('tr.changeHint')}
                  </T>
                </>
              )}
              <Button
                kind="secondary"
                icon="copy-outline"
                title={t('tr.duplicate')}
                onPress={() => {
                  save();
                  const nid = training.duplicatePlan(plan.id);
                  router.replace(`/plan/${nid}`);
                }}
              />
              {plan.status !== 'archived' && (
                <Button
                  kind="ghost"
                  icon="archive-outline"
                  title={t('tr.archive')}
                  onPress={() => {
                    save();
                    training.archivePlan(plan.id);
                    router.back();
                  }}
                />
              )}
              <Button
                kind="ghost"
                icon="trash-outline"
                title={t('common.delete')}
                onPress={async () => {
                  if (
                    !(await confirm(t('tr.deletePlanQ'), {
                      ok: t('common.delete'),
                      cancel: t('common.cancel'),
                      destructive: true,
                    }))
                  )
                    return;
                  training.deletePlan(plan.id);
                  router.back();
                }}
              />
            </View>
          )}
          {!existing && (
            <Button
              icon="play-outline"
              title={`${t('common.save')} + ${t('tr.activate').toLowerCase()}`}
              onPress={() => {
                const p = save();
                training.activatePlan(p.id);
                router.back();
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={!!pickerFor}
        onClose={() => setPickerFor(null)}
        onPick={(exerciseId) => {
          if (!pickerFor) return;
          const ex: PlanExercise = {
            id: uid('pe'),
            exerciseId,
            schemes: [{ id: uid('ss'), sets: 3, reps: 3, load: { type: 'percent', value: 70, of: defaultPctOf(exerciseId) } }],
          };
          patchDay(pickerFor, (d) => ({ ...d, exercises: [...d.exercises, ex] }));
        }}
      />

      <SchemeSheet
        visible={!!schemeEdit}
        scheme={
          schemeEdit?.scheme ??
          (editingEx
            ? {
                ...(editingEx.schemes.at(-1) ?? {
                  sets: 3,
                  reps: 3,
                  load: { type: 'percent', value: 70, of: defaultPctOf(editingEx.exerciseId) },
                }),
                id: '',
              }
            : null)
        }
        exerciseId={editingEx?.exerciseId ?? 'snatch'}
        onClose={() => setSchemeEdit(null)}
        onDelete={
          schemeEdit?.scheme
            ? () =>
                patchEx(schemeEdit.dayId, schemeEdit.exId, (e) => ({
                  ...e,
                  schemes: e.schemes.filter((s) => s.id !== schemeEdit.scheme!.id),
                }))
            : undefined
        }
        onSave={(s) => {
          if (!schemeEdit) return;
          patchEx(schemeEdit.dayId, schemeEdit.exId, (e) =>
            schemeEdit.scheme
              ? { ...e, schemes: e.schemes.map((x) => (x.id === schemeEdit.scheme!.id ? { ...s, id: x.id } : x)) }
              : { ...e, schemes: [...e.schemes, { ...s, id: uid('ss') }] },
          );
        }}
      />

      <Sheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet === 'weeks' ? t('tr.blockLength') : t('tr.progression')}
      >
        <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
          {sheet === 'weeks' ? (
            <Wheel
              values={WEEKS}
              value={plan.weeks ?? 0}
              onChange={(v) => patch({ weeks: v || null })}
              format={(v) => (v ? `${v} ${t('common.weeks')}` : t('tr.unlimited'))}
              width={200}
            />
          ) : (
            <Wheel
              values={INCREMENTS}
              value={plan.weeklyIncrementPct ?? 0}
              onChange={(v) => patch({ weeklyIncrementPct: v })}
              format={(v) => `+${formatNumber(v)} %`}
              width={160}
            />
          )}
          <Button title={t('common.done')} onPress={() => setSheet(null)} style={{ alignSelf: 'stretch' }} />
        </View>
      </Sheet>
    </Screen>
  );
}
