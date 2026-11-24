import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BarChart, LiftChart } from '../../components/coach/Charts';
import { formatTonnage } from '../../components/training/format';
import { LogList } from '../../components/training/LogView';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Chip,
  Empty,
  Header,
  IconButton,
  Loading,
  Row,
  Screen,
  Segmented,
  T,
} from '../../components/ui';
import { exerciseName, MAX_LIFTS } from '../../data/exercises';
import { api } from '../../lib/api';
import { bestLiftSeries, topExercises, weeklyTonnage } from '../../lib/coach';
import { formatDate } from '../../lib/date';
import { confirm } from '../../lib/dialog';
import { activePlan } from '../../lib/training';
import type { Profile, TrainingData, TrainingPlan } from '../../lib/types';
import { formatBodyweight, formatWeight } from '../../lib/units';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';

type Tab = 'log' | 'charts' | 'plans';

/** Trenér: detail svěřence – deník, grafy a plány. */
export default function AthleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors, settings } = useSettings();
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>('log');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [data, setData] = useState<TrainingData | null | undefined>(undefined);
  const [unread, setUnread] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      api
        .getProfile(id)
        .then(setProfile)
        .catch(() => {});
      api
        .athleteTraining(id)
        .then((d) => setData(d ?? { version: 1, plans: [], logs: [], maxes: {}, customExercises: [], updatedAt: '' }))
        .catch(() => setData(null));
      api
        .unreadComments()
        .then(setUnread)
        .catch(() => {});
    }, [id]),
  );

  const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';

  const header = (
    <View style={{ gap: 12, paddingTop: 12, paddingBottom: 4 }}>
      <Row gap={12}>
        <Avatar uri={profile?.avatarUrl} name={name} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h2" numberOfLines={1}>
            {name}
          </T>
          {profile?.bodyweight ? (
            <T v="small" muted>
              {t('pr.bodyweight')}: {formatBodyweight(profile.bodyweight, settings.unit)}
            </T>
          ) : null}
        </View>
        <IconButton name="chatbubble-ellipses-outline" label={t('soc.message')} onPress={() => router.push(`/chat/${id}`)} />
      </Row>
      {data && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {MAX_LIFTS.filter((l) => data.maxes[l]).map((l) => (
            <View
              key={l}
              style={{ backgroundColor: colors.primarySoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}
            >
              <T v="caption" color={colors.primary}>
                {exerciseName(l, settings.lang)}
              </T>
              <T style={{ fontWeight: '800' }} color={colors.primary}>
                {formatWeight(data.maxes[l], settings.unit)}
              </T>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={name}
        right={
          <IconButton
            name="person-remove-outline"
            label={t('coach.removeAthlete')}
            onPress={async () => {
              if (
                !(await confirm(t('coach.removeAthleteQ', { name }), {
                  ok: t('coach.removeAthlete'),
                  cancel: t('common.cancel'),
                  destructive: true,
                }))
              )
                return;
              await api.removeCoachLink(session?.userId ?? '', id).catch(() => {});
              router.back();
            }}
          />
        }
      />
      <View style={{ paddingHorizontal: 16 }}>
        {header}
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'log', label: t('tr.log') },
            { key: 'charts', label: t('coach.charts') },
            { key: 'plans', label: t('tr.sheetPlans') },
          ]}
        />
      </View>
      {data === undefined ? (
        <Loading />
      ) : data === null ? (
        <Empty icon="lock-closed-outline" text={t('coach.noAccess')} />
      ) : tab === 'log' ? (
        <LogList
          logs={data.logs}
          customExercises={data.customExercises}
          onOpen={(l) => router.push({ pathname: '/team/log', params: { athlete: id, log: l.id } })}
          unread={(l) => unread[`${id}:${l.id}`] ?? 0}
        />
      ) : tab === 'charts' ? (
        <ChartsTab data={data} />
      ) : (
        <PlansTab athleteId={id} data={data} />
      )}
    </Screen>
  );
}

function ChartsTab({ data }: { data: TrainingData }) {
  const { t, settings, locale } = useSettings();
  const lifts = topExercises(data.logs);
  const [lift, setLift] = useState<string>(lifts.includes('snatch') ? 'snatch' : (lifts[0] ?? 'snatch'));
  const series = bestLiftSeries(data.logs, lift);
  const weeks = weeklyTonnage(data.logs, 8);
  if (!data.logs.length) return <Empty icon="stats-chart-outline" text={t('tr.noLogs')} />;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card style={{ gap: 10 }}>
        <T v="h3">{t('coach.chartLift')}</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {lifts.map((l) => (
            <Chip
              key={l}
              label={exerciseName(l, settings.lang, data.customExercises)}
              on={lift === l}
              onPress={() => setLift(l)}
            />
          ))}
        </ScrollView>
        {series.length ? <LiftChart points={series} unitLabel="kg" /> : <T muted>{t('coach.noData')}</T>}
      </Card>
      <Card style={{ gap: 10 }}>
        <T v="h3">{t('coach.chartTonnage')}</T>
        <BarChart
          bars={weeks.map((w) => ({ label: formatDate(w.week, locale, { day: 'numeric', month: 'numeric' }), value: w.tonnage }))}
          format={(v) => formatTonnage(v, settings.unit)}
        />
        <T v="caption" muted>
          {t('coach.chartTonnageHint')}
        </T>
      </Card>
    </ScrollView>
  );
}

function PlansTab({ athleteId, data }: { athleteId: string; data: TrainingData }) {
  const { t, colors, locale } = useSettings();
  const training = useTraining();
  const { session } = useAuth();
  const current = activePlan(data);
  const [assigned, setAssigned] = useState<TrainingPlan[] | null>(null);

  const plans = training.data.plans;
  useEffect(() => {
    let alive = true;
    (async () => {
      const mine: TrainingPlan[] = [];
      for (const p of plans.filter((x) => !x.fromCoach)) {
        const who = await api.planAssignees(p.id).catch(() => [] as string[]);
        if (who.includes(athleteId)) mine.push(p);
      }
      if (alive) setAssigned(mine);
    })();
    return () => {
      alive = false;
    };
  }, [athleteId, plans]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
      <Card style={{ gap: 6 }}>
        <T v="label" muted>
          {t('coach.currentPlan')}
        </T>
        {current ? (
          <>
            <T v="h3">{current.name}</T>
            <T v="small" muted>
              {t('tr.since', { date: formatDate(current.startDate, locale) })}
              {current.fromCoach && current.fromCoach.coachId === session?.userId ? ` · ${t('coach.fromYou')}` : ''}
            </T>
          </>
        ) : (
          <T muted>{t('coach.athleteNoPlan')}</T>
        )}
      </Card>

      <T v="h3">{t('coach.sentPlans')}</T>
      {assigned === null ? (
        <Loading />
      ) : assigned.length === 0 ? (
        <T muted>{t('coach.noSentPlans')}</T>
      ) : (
        assigned.map((p) => (
          <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="paper-plane" size={18} color={colors.primary} />
            <T style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>
              {p.name}
            </T>
            <Button
              small
              kind="ghost"
              title={t('coach.unassign')}
              onPress={async () => {
                if (
                  !(await confirm(t('coach.unassignQ'), {
                    ok: t('coach.unassign'),
                    cancel: t('common.cancel'),
                    destructive: true,
                  }))
                )
                  return;
                await api.unassignPlan(p.id, athleteId).catch(() => {});
                setAssigned((l) => (l ?? []).filter((x) => x.id !== p.id));
              }}
            />
          </Card>
        ))
      )}
      <Banner icon="information-circle-outline" text={t('coach.sendPlanHint')} />
      <Button icon="add" title={t('coach.newPlanFor')} onPress={() => router.push('/plan/new')} />
    </ScrollView>
  );
}
