import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { exerciseName } from '../../data/exercises';
import { TEMPLATES } from '../../data/templates';
import { formatDate, todayISO, weekdayMon0 } from '../../lib/date';
import { toast } from '../../lib/dialog';
import type { TKey } from '../../lib/i18n';
import { activePlan, dayForDate, dayLabel, planWeek, upcomingPlan, weekStats, weekStreak, workoutFromDay } from '../../lib/training';
import type { PlanDay, TrainingPlan } from '../../lib/types';
import { formatNumber, ROUND_KG } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { Banner, Button, Card, Chip, Empty, Row, Stat, T } from '../ui';
import { DayExercises } from './DayExercises';
import { formatTonnage, schemeLabel } from './format';
import { createPlanFromTemplate } from './planActions';

export function TodayView() {
  const { t, colors, settings, locale } = useSettings();
  const training = useTraining();
  const { data, active } = training;
  const plan = activePlan(data);
  const upcoming = upcomingPlan(data);
  const now = new Date();
  const todayWd = weekdayMon0(now);
  const week = plan ? planWeek(plan, now) : 1;
  const todayDay = plan ? dayForDate(plan, now) : null;
  const [picked, setPicked] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const day = plan?.days.find((d) => d.id === picked) ?? todayDay;
  const stats = useMemo(() => weekStats(data), [data]);
  const streak = useMemo(() => weekStreak(data), [data]);
  const wdName = (w: number) => t(`tr.weekdayFull.${w}` as TKey);
  const label = (d: PlanDay) => dayLabel(d, wdName, todayWd);

  const start = (p: TrainingPlan | null, d: PlanDay | null) => {
    if (active) return router.push('/workout');
    training.startWorkout({
      date: todayISO(),
      planId: p?.id ?? null,
      dayId: d?.id ?? null,
      title: d ? label(d) : t('tr.freeWorkout'),
      exercises: p && d ? workoutFromDay(d, p, data, ROUND_KG, now) : [],
    });
    router.push('/workout');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
      {active && (
        <Card onPress={() => router.push('/workout')} style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T v="label" color="rgba(255,255,255,0.8)">
                {t('tr.continue')}
              </T>
              <T v="h3" color="#FFF">
                {active.title}
              </T>
            </View>
            <Ionicons name="play-circle" size={40} color="#FFF" />
          </Row>
        </Card>
      )}

      <Card style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 }}>
        <Stat value={stats.count} label={`${t('tr.workouts')} · ${t('tr.thisWeek').toLowerCase()}`} />
        <Stat value={formatTonnage(stats.tonnage, settings.unit)} label={t('tr.tonnage')} />
        <Stat value={streak} label={t('tr.streak')} />
      </Card>

      {plan ? (
        <>
          <Card onPress={() => router.push(`/plan/${plan.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="label" color={colors.success}>
                {t('tr.activePlan')}
              </T>
              <T v="small" muted>
                {plan.weeks ? t('tr.weekOfTotal', { n: week, total: plan.weeks }) : t('tr.weekOf', { n: week })}
              </T>
            </Row>
            <T v="h2">{plan.name}</T>
            <T v="small" muted>
              {t('tr.since', { date: formatDate(plan.startDate, locale) })}
              {plan.weeklyIncrementPct ? ` · ${t('tr.progression').toLowerCase()} +${formatNumber(plan.weeklyIncrementPct)} %` : ''}
            </T>
            {plan.weeks ? (
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.primarySoft, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, (week / plan.weeks) * 100)}%`, height: 6, backgroundColor: colors.accent }} />
              </View>
            ) : null}
            <T v="caption" muted>
              {t('tr.copyWeek')}
            </T>
          </Card>

          {upcoming && (
            <Banner icon="calendar-outline" text={`${upcoming.name} – ${t('tr.since', { date: formatDate(upcoming.startDate, locale) })}`} />
          )}

          <View style={{ gap: 8 }}>
            <T v="label" muted>
              {t('tr.todaysWorkout')}
            </T>
            {!todayDay && !picked && <T muted>{t('tr.restDay')}</T>}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {plan.days.map((d) => (
                <Chip
                  key={d.id}
                  label={`${d.weekdays.map((w) => t(`tr.weekday.${w}` as TKey)).join('/')}${d.weekdays.length ? ' · ' : ''}${label(d)}`}
                  on={day?.id === d.id}
                  onPress={() => {
                    setPicked(d.id);
                    setEditing(false);
                  }}
                />
              ))}
            </ScrollView>
          </View>

          {day && (
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <T style={{ fontSize: 22, fontWeight: '800', flex: 1 }}>{label(day)}</T>
                <Chip
                  icon={editing ? 'checkmark' : 'create-outline'}
                  label={editing ? t('tr.editDone') : t('common.edit')}
                  on={editing}
                  onPress={() => {
                    if (editing) toast(t('tr.savedToPlan'));
                    setEditing(!editing);
                  }}
                />
              </Row>
              {editing ? (
                <DayExercises
                  plan={plan}
                  day={day}
                  onChange={(fn) => training.savePlan({ ...plan, days: plan.days.map((d) => (d.id === day.id ? fn(d) : d)) })}
                />
              ) : (
                <>
                  {day.exercises.length === 0 && <T muted>{t('tr.noExercises')}</T>}
                  {day.exercises.map((e, i) => (
                    <View key={e.id} style={{ paddingVertical: 8, gap: 2, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                      <T style={{ fontSize: 18, fontWeight: '800' }}>{exerciseName(e.exerciseId, settings.lang, data.customExercises, e.customName)}</T>
                      {e.schemes.map((s) => (
                        <T key={s.id} style={{ fontSize: 15 }} muted>
                          {schemeLabel(s, data, plan, week, settings.unit, ROUND_KG)}
                        </T>
                      ))}
                    </View>
                  ))}
                </>
              )}
              <Button icon="play" title={active ? t('tr.continue') : t('tr.start')} onPress={() => start(plan, day)} />
            </Card>
          )}
        </>
      ) : (
        <Card>
          <Empty icon="barbell-outline" text={`${t('tr.noActivePlan')}\n${t('tr.noActivePlanHint')}`} />
          <Button icon="add" title={t('tr.createPlan')} onPress={() => router.push('/plan/new')} />
          <T v="label" muted style={{ marginTop: 8 }}>
            {t('tr.fromTemplate')}
          </T>
          {TEMPLATES.map((tp) => (
            <Button
              key={tp.id}
              kind="secondary"
              icon="copy-outline"
              title={t(tp.label)}
              onPress={() => {
                const id = createPlanFromTemplate(training, tp.id, settings.lang, true);
                router.push(`/plan/${id}`);
              }}
            />
          ))}
        </Card>
      )}

      <Button kind="secondary" icon="flash-outline" title={t('tr.freeWorkout')} onPress={() => start(null, null)} />
    </ScrollView>
  );
}
