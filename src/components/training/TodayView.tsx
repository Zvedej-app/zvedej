import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { exerciseName } from '../../data/exercises';
import { TEMPLATES } from '../../data/templates';
import { formatDate, todayISO, weekdayMon0 } from '../../lib/date';
import { toast } from '../../lib/dialog';
import { api } from '../../lib/api';
import { plural, type TKey } from '../../lib/i18n';
import { activePlan, dayForDate, dayLabel, planWeek, upcomingPlan, workoutFromDay } from '../../lib/training';
import type { AssignedPlan, MyCoach, PlanDay, TrainingPlan } from '../../lib/types';
import { formatNumber, ROUND_KG } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { useAuth } from '../../providers/AuthProvider';
import { WeekHero } from './WeekHero';
import { WellnessCard } from '../wellness/WellnessCard';
import { Banner, Button, Card, Chip, Empty, Row, T } from '../ui';
import { DayExercises } from './DayExercises';
import { schemeLabel } from './format';
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
  const { profile, session } = useAuth();
  const [invites, setInvites] = useState<MyCoach[]>([]);
  const [newPlans, setNewPlans] = useState<AssignedPlan[]>([]);
  const sync = training.syncCoachPlans;
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      sync();
      api
        .myCoaches()
        .then((l) => alive && setInvites(l.filter((c) => c.status === 'pending')))
        .catch(() => {});
      api
        .myAssignedPlans()
        .then((l) => alive && setNewPlans(l.filter((a) => !a.seenAt)))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [sync]),
  );
  const seeNewPlans = () => {
    setNewPlans([]);
    api.markAssignedPlansSeen().catch(() => {});
  };
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

      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <T v="h1">{profile?.firstName ? t('tr.hello', { name: profile.firstName }) : t('tr.helloAnon')}</T>
        <T muted style={{ fontWeight: '500', fontSize: 16 }}>
          {t('tr.motto')}
        </T>
      </View>

      {profile?.needsParentConsent && (
        <Card
          onPress={() => router.push('/parent-request')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.primary, borderWidth: 1.5 }}
        >
          <Ionicons name="people" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '800' }}>{t('parent.banner')}</T>
            <T v="caption" muted>
              {t('parent.bannerSub')}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>
      )}
      {session?.needsPassword && (
        <Card onPress={() => router.push('/set-password')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="lock-closed" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '800' }}>{t('guest.finishAccount')}</T>
            <T v="caption" muted>
              {t('guest.setPasswordHint')}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>
      )}
      {session?.isAnonymous && data.logs.length > 0 && (
        <Card
          onPress={() => router.push('/account')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.primary, borderWidth: 1.5 }}
        >
          <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '800' }}>{t('guest.saveTitle')}</T>
            <T v="caption" muted>
              {t('guest.saveShort')}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>
      )}
      {invites.map((c) => (
        <Card
          key={c.profile.id}
          onPress={() => router.push('/coaches')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.accent, borderWidth: 1.5 }}
        >
          <Ionicons name="people" size={24} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '800' }}>
              {t('coach.inviteBanner', { name: `${c.profile.firstName} ${c.profile.lastName}`.trim() })}
            </T>
            <T v="caption" muted>
              {t('coach.inviteBannerSub')}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>
      ))}

      {newPlans.length > 0 && (
        <Card style={{ gap: 10, backgroundColor: colors.success, borderColor: colors.success }}>
          <Row gap={10}>
            <Ionicons name="paper-plane" size={22} color="#FFF" />
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '800' }} color="#FFF">
                {t('coach.newPlanBanner', { name: newPlans[0].coachName })}
              </T>
              <T v="small" color="rgba(255,255,255,0.9)">
                {newPlans.map((a) => a.plan.name).join(', ')}
              </T>
            </View>
          </Row>
          <Button
            small
            kind="secondary"
            title={t('coach.gotIt')}
            onPress={seeNewPlans}
            style={{ alignSelf: 'flex-start', backgroundColor: '#FFF' }}
          />
        </Card>
      )}

      <WeekHero data={data} plan={plan} />

      <WellnessCard />

      {plan ? (
        <>
          <SectionHead icon="calendar" color={colors.success} title={t('tr.planSection')} />
          <Card
            onPress={() => router.push(`/plan/${plan.id}`)}
            style={{ borderLeftWidth: 5, borderLeftColor: colors.success, gap: 6 }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="label" color={colors.success}>
                {plan.fromCoach ? t('coach.planFrom', { name: plan.fromCoach.coachName }) : t('tr.activePlan')}
              </T>
              <T v="small" muted>
                {plan.weeks ? t('tr.weekOfTotal', { n: week, total: plan.weeks }) : t('tr.weekOf', { n: week })}
              </T>
            </Row>
            <T v="h2">{plan.name}</T>
            <T v="small" muted>
              {t('tr.since', { date: formatDate(plan.startDate, locale) })}
              {plan.weeklyIncrementPct
                ? ` · ${t('tr.progression').toLowerCase()} +${formatNumber(plan.weeklyIncrementPct)} %`
                : ''}
            </T>
            {plan.weeks ? (
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.primarySoft, overflow: 'hidden' }}>
                <View
                  style={{ width: `${Math.min(100, (week / plan.weeks) * 100)}%`, height: 6, backgroundColor: colors.success }}
                />
              </View>
            ) : null}
            <T v="caption" muted>
              {t('tr.copyWeek')}
            </T>
          </Card>

          {upcoming && (
            <Banner
              icon="calendar-outline"
              text={`${upcoming.name} – ${t('tr.since', { date: formatDate(upcoming.startDate, locale) })}`}
            />
          )}

          {/* zřetelný předěl mezi plánem a dnešním tréninkem */}
          <View style={{ height: 1, backgroundColor: colors.border, marginTop: 10, marginHorizontal: 4 }} />
          <SectionHead
            icon="barbell"
            color={colors.accent}
            title={t('tr.todaySection')}
            sub={formatDate(todayISO(), locale, { weekday: 'long', day: 'numeric', month: 'long' })}
          />
          <View style={{ gap: 8 }}>
            {!todayDay && !picked && <T muted>{t('tr.restDay')}</T>}
            <T v="caption" muted style={{ marginLeft: 2 }}>
              {t('tr.pickDay')}
            </T>
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
            <Card style={{ borderRadius: 22, padding: 18, gap: 10, borderWidth: 1.5, borderColor: colors.accent }}>
              <T v="label" color={colors.accent}>
                {todayDay && day.id === todayDay.id ? t('tr.todayTitle') : t('tr.todaysWorkout')} ·{' '}
                {plural(settings.lang, 'exercise', day.exercises.length)}
              </T>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="h1" style={{ flex: 1, fontSize: 26 }}>
                  {label(day)}
                </T>
                {!plan.fromCoach && (
                  <Chip
                    icon={editing ? 'checkmark' : 'create-outline'}
                    label={editing ? t('tr.editDone') : t('common.edit')}
                    on={editing}
                    onPress={() => {
                      if (editing) toast(t('tr.savedToPlan'));
                      setEditing(!editing);
                    }}
                  />
                )}
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
                    <View
                      key={e.id}
                      style={{ paddingVertical: 8, gap: 2, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
                    >
                      <T v="h3">{exerciseName(e.exerciseId, settings.lang, data.customExercises, e.customName)}</T>
                      {e.schemes.map((s) => (
                        <T key={s.id} style={{ fontSize: 15 }} muted>
                          {schemeLabel(s, data, plan, week, settings.unit, ROUND_KG)}
                        </T>
                      ))}
                    </View>
                  ))}
                </>
              )}
              <Button
                icon="play"
                title={active ? t('tr.continue') : t('tr.start')}
                onPress={() => start(plan, day)}
                style={{ minHeight: 56, borderRadius: 16, backgroundColor: colors.accent }}
              />
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

      <View style={{ height: 1, backgroundColor: colors.border, marginTop: 10, marginHorizontal: 4 }} />
      <SectionHead icon="flash" color={colors.primary} title={t('tr.otherOptions')} />
      <Button kind="secondary" icon="flash-outline" title={t('tr.freeWorkout')} onPress={() => start(null, null)} />
    </ScrollView>
  );
}

/** Nadpis oddílu: barevná ikona v kroužku, název a volitelný podtitul */
function SectionHead({
  icon,
  color,
  title,
  sub,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  title: string;
  sub?: string;
}) {
  return (
    <Row gap={10} style={{ marginTop: 6 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        <T v="h2" style={{ fontSize: 20 }}>
          {title}
        </T>
        {sub ? (
          <T v="small" muted>
            {sub.charAt(0).toUpperCase() + sub.slice(1)}
          </T>
        ) : null}
      </View>
    </Row>
  );
}
