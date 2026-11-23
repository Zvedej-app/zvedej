import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { CalendarPicker } from '../../components/CalendarPicker';
import { DayExercises } from '../../components/training/DayExercises';
import { Button, Card, Chip, Field, Header, IconButton, ListItem, Row, Screen, Sheet, T } from '../../components/ui';
import { range, Wheel } from '../../components/WheelPicker';
import { newPlan } from '../../data/templates';
import { addDays, formatDate, nextMonday, parseISODate, startOfWeek, toISODate, todayISO } from '../../lib/date';
import { confirm } from '../../lib/dialog';
import type { TKey } from '../../lib/i18n';
import { uid } from '../../lib/id';
import { dayLabel } from '../../lib/training';
import type { PlanDay, TrainingPlan } from '../../lib/types';
import { formatNumber } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';

const WEEKS: number[] = [0, ...range(1, 24)];
const INCREMENTS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5];
const WD = [0, 1, 2, 3, 4, 5, 6];

export default function PlanEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors } = useSettings();
  const training = useTraining();
  const existing = training.data.plans.find((p) => p.id === id) ?? null;
  const [plan, setPlan] = useState<TrainingPlan>(() => existing ?? newPlan({ name: '' }));
  // nový plán se tvoří průvodcem po krocích, existující se upravuje na jedné stránce
  const wizard = !existing;
  const [step, setStep] = useState(1);
  const today = todayISO();
  const isRunning = plan.status === 'active' && plan.startDate <= today && (!plan.endDate || plan.endDate >= today);

  const patch = (p: Partial<TrainingPlan>) => setPlan((x) => ({ ...x, ...p }));
  const patchDay = (dayId: string, fn: (d: PlanDay) => PlanDay) =>
    setPlan((x) => ({ ...x, days: x.days.map((d) => (d.id === dayId ? fn(d) : d)) }));

  const wdName = (w: number) => t(`tr.weekdayFull.${w}` as TKey);

  const save = () => {
    const final = { ...plan, name: plan.name.trim() || t('tr.newPlan') };
    training.savePlan(final);
    return final;
  };

  /* ---------------------------- průvodce ---------------------------- */
  if (wizard) {
    const stepTitles = [t('tr.step1'), t('tr.step2'), t('tr.step3')];
    const toggleWeekday = async (w: number) => {
      const has = plan.days.find((d) => d.weekdays.includes(w));
      if (has) {
        if (
          has.exercises.length &&
          !(await confirm(t('common.confirmDelete'), { ok: t('common.delete'), cancel: t('common.cancel'), destructive: true }))
        )
          return;
        setPlan((x) => ({ ...x, days: x.days.filter((d) => d !== has) }));
      } else {
        setPlan((x) => ({
          ...x,
          days: [...x.days, { id: uid('pd'), name: wdName(w), nameAuto: true, weekdays: [w], exercises: [] }].sort(
            (a, b) => (a.weekdays[0] ?? 0) - (b.weekdays[0] ?? 0),
          ),
        }));
      }
    };
    const finish = (activate: boolean) => {
      const p = save();
      if (activate) training.activatePlan(p.id);
      router.back();
    };
    return (
      <Screen>
        <Header
          left={<IconButton name={step === 1 ? 'close' : 'chevron-back'} onPress={() => (step === 1 ? router.back() : setStep(step - 1))} label={t('common.back')} />}
          title={t('tr.newPlan')}
        />
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
          <Row gap={6}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: n <= step ? colors.accent : colors.border }} />
            ))}
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="label" color={colors.accent}>
              {t('tr.step', { n: step, total: 3 })}
            </T>
            <T v="label" muted>
              {stepTitles[step - 1]}
            </T>
          </Row>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            {step === 1 && <BasicsSection plan={plan} patch={patch} />}
            {step === 2 && (
              <>
                <T v="h2">{t('tr.whichDays')}</T>
                <T muted>{t('tr.whichDaysHint')}</T>
                <View style={{ gap: 10 }}>
                  {WD.map((w) => {
                    const on = plan.days.some((d) => d.weekdays.includes(w));
                    return (
                      <Chip key={w} label={wdName(w)} on={on} icon={on ? 'checkmark-circle' : 'ellipse-outline'} onPress={() => toggleWeekday(w)} />
                    );
                  })}
                </View>
              </>
            )}
            {step === 3 && (
              <>
                <T muted>{t('tr.addExercisesHint')}</T>
                {plan.days.map((d) => (
                  <Card key={d.id}>
                    <T style={{ fontSize: 22, fontWeight: '800' }}>{dayLabel(d, wdName)}</T>
                    <DayExercises plan={plan} day={d} onChange={(fn) => patchDay(d.id, fn)} />
                  </Card>
                ))}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          {step < 3 ? (
            <Button title={t('tr.next')} icon="arrow-forward" disabled={step === 2 && plan.days.length === 0} onPress={() => setStep(step + 1)} />
          ) : (
            <>
              <Button icon="play" title={t('tr.saveActivate')} onPress={() => finish(true)} />
              <Button kind="ghost" title={t('tr.saveDraft')} onPress={() => finish(false)} />
            </>
          )}
        </View>
      </Screen>
    );
  }

  /* ------------------------- úprava existujícího ------------------------- */
  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('tr.editPlan')}
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
          <BasicsSection plan={plan} patch={patch} />
          <DaysSection plan={plan} setPlan={setPlan} patchDay={patchDay} wdName={wdName} />

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
                if (!(await confirm(t('tr.deletePlanQ'), { ok: t('common.delete'), cancel: t('common.cancel'), destructive: true }))) return;
                training.deletePlan(plan.id);
                router.back();
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/* ------------------------------------------------------------------------ */

function BasicsSection({ plan, patch }: { plan: TrainingPlan; patch: (p: Partial<TrainingPlan>) => void }) {
  const { t, locale } = useSettings();
  const today = todayISO();
  const [sheet, setSheet] = useState<'weeks' | 'inc' | null>(null);
  const [calendar, setCalendar] = useState(false);
  const monday = toISODate(startOfWeek(new Date()));
  const nextMon = toISODate(nextMonday());
  const chip = (iso: string) => formatDate(iso, locale, { weekday: 'short', day: 'numeric', month: 'numeric' });

  return (
    <View style={{ gap: 14 }}>
      <Field label={t('tr.planName')} placeholder={t('tr.planNamePh')} value={plan.name} onChangeText={(name) => patch({ name })} />
      <Card>
        <T v="label" muted>
          {t('tr.startDate')}
        </T>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton name="chevron-back-circle-outline" onPress={() => patch({ startDate: toISODate(addDays(parseISODate(plan.startDate), -1)) })} />
          <T v="h3" style={{ textAlign: 'center', flex: 1 }}>
            {formatDate(plan.startDate, locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </T>
          <IconButton name="chevron-forward-circle-outline" onPress={() => patch({ startDate: toISODate(addDays(parseISODate(plan.startDate), 1)) })} />
        </Row>
        <Row style={{ flexWrap: 'wrap' }} gap={6}>
          <Chip label={t('common.today')} on={plan.startDate === today} onPress={() => patch({ startDate: today })} />
          <Chip label={chip(monday)} on={plan.startDate === monday} onPress={() => patch({ startDate: monday })} />
          <Chip label={chip(nextMon)} on={plan.startDate === nextMon} onPress={() => patch({ startDate: nextMon })} />
          <Chip
            icon="calendar-outline"
            label={calendar ? t('tr.hideCalendar') : t('tr.pickDate')}
            on={calendar}
            onPress={() => setCalendar((c) => !c)}
          />
        </Row>
        {calendar && <CalendarPicker value={plan.startDate} onChange={(iso) => patch({ startDate: iso })} />}
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

      <Sheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'weeks' ? t('tr.blockLength') : t('tr.progression')}>
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
    </View>
  );
}

function DaysSection({
  plan,
  setPlan,
  patchDay,
  wdName,
}: {
  plan: TrainingPlan;
  setPlan: React.Dispatch<React.SetStateAction<TrainingPlan>>;
  patchDay: (id: string, fn: (d: PlanDay) => PlanDay) => void;
  wdName: (w: number) => string;
}) {
  const { t, colors } = useSettings();
  const [adding, setAdding] = useState(false);

  const addDay = (w: number) => {
    setPlan((x) => ({
      ...x,
      days: [...x.days, { id: uid('pd'), name: wdName(w), nameAuto: true, weekdays: [w], exercises: [] }],
    }));
    setAdding(false);
  };

  return (
    <View style={{ gap: 12 }}>
      <T v="label" muted>
        {t('tr.days')}
      </T>
      {plan.days.map((d) => {
        const label = dayLabel(d, wdName);
        return (
          <Card key={d.id} style={{ gap: 10 }}>
            <Row>
              <Field
                value={label}
                onChangeText={(name) => patchDay(d.id, (x) => ({ ...x, name, nameAuto: false }))}
                style={{ flex: 1 }}
                placeholder={t('tr.dayName2')}
                inputStyle={{ fontSize: 20, fontWeight: '800' }}
              />
              <IconButton
                name="trash-outline"
                color={colors.danger}
                label={t('common.delete')}
                onPress={async () => {
                  if (d.exercises.length && !(await confirm(t('common.confirmDelete'), { ok: t('common.delete'), cancel: t('common.cancel'), destructive: true })))
                    return;
                  setPlan((x) => ({ ...x, days: x.days.filter((y) => y.id !== d.id) }));
                }}
              />
            </Row>
            <Row gap={4} style={{ justifyContent: 'space-between' }}>
              {WD.map((w) => {
                const on = d.weekdays.includes(w);
                return (
                  <Chip
                    key={w}
                    label={t(`tr.weekday.${w}` as TKey)}
                    on={on}
                    onPress={() =>
                      patchDay(d.id, (x) => ({ ...x, weekdays: on ? x.weekdays.filter((y) => y !== w) : [...x.weekdays, w].sort() }))
                    }
                  />
                );
              })}
            </Row>
            {d.nameAuto && d.weekdays.length > 1 && (
              <T v="caption" muted>
                {t('tr.sharedDayHint')}
              </T>
            )}
            <DayExercises plan={plan} day={d} onChange={(fn) => patchDay(d.id, fn)} showNotes />
          </Card>
        );
      })}
      <Button kind="secondary" icon="calendar-outline" title={t('tr.addDay')} onPress={() => setAdding(true)} />

      <Sheet visible={adding} onClose={() => setAdding(false)} title={t('tr.pickWeekday')}>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {WD.map((w) => {
            const used = plan.days.some((d) => d.weekdays.includes(w));
            return <ListItem key={w} title={wdName(w)} subtitle={used ? t('tr.sharedDayHint') : undefined} onPress={() => addDay(w)} />;
          })}
        </View>
      </Sheet>
    </View>
  );
}
