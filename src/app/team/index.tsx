import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { formatTonnage } from '../../components/training/format';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Empty,
  Header,
  IconButton,
  Loading,
  PressScale,
  Row,
  Screen,
  Segmented,
  T,
} from '../../components/ui';
import { ageGroupLabel, sinclairTotal } from '../../lib/categories';
import { api } from '../../lib/api';
import { memberSummary, monthStats } from '../../lib/coach';
import { addDays, toISODate } from '../../lib/date';
import { readiness } from '../../lib/wellness';
import { confirm } from '../../lib/dialog';
import { plural, type TKey } from '../../lib/i18n';
import { FONTS } from '../../lib/theme';
import type { CoachGroup, TeamMember } from '../../lib/types';
import { formatNumber } from '../../lib/units';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';

type Tab = 'athletes' | 'groups' | 'ranking';

/** Trenér: přehled týmu, skupiny a žebříček. */
export default function TeamScreen() {
  const { t } = useSettings();
  const [tab, setTab] = useState<Tab>('athletes');
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [groups, setGroups] = useState<CoachGroup[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});

  const load = useCallback(() => {
    api
      .coachTeam()
      .then(setTeam)
      .catch(() => setTeam([]));
    api
      .listGroups()
      .then(setGroups)
      .catch(() => {});
    api
      .unreadComments()
      .then(setUnread)
      .catch(() => {});
  }, []);
  useFocusEffect(load);

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('coach.team')}
        right={<IconButton name="person-add-outline" onPress={() => router.push('/team/invite')} label={t('coach.invite')} />}
      />
      <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'athletes', label: t('coach.athletes') },
            { key: 'groups', label: t('coach.groups') },
            { key: 'ranking', label: t('coach.ranking') },
          ]}
        />
      </View>
      {team === null ? (
        <Loading />
      ) : tab === 'athletes' ? (
        <Athletes team={team} unread={unread} onChange={load} />
      ) : tab === 'groups' ? (
        <Groups team={team} groups={groups} />
      ) : (
        <Ranking team={team} groups={groups} />
      )}
    </Screen>
  );
}

/* ----------------------------- Svěřenci ----------------------------- */

function Athletes({ team, unread, onChange }: { team: TeamMember[]; unread: Record<string, number>; onChange: () => void }) {
  const { t, colors, settings } = useSettings();
  const { session } = useAuth();
  const accepted = team.filter((m) => m.status === 'accepted');
  const pending = team.filter((m) => m.status === 'pending');

  if (!team.length)
    return (
      <Empty
        icon="people-outline"
        text={t('coach.emptyTeam')}
        action={<Button icon="person-add-outline" title={t('coach.invite')} onPress={() => router.push('/team/invite')} />}
      />
    );

  // nejdřív ti, kdo dlouho netrénovali nebo mají poznámku – trenér je uvidí hned nahoře
  const score = (m: TeamMember) => {
    const s = memberSummary(m);
    return (s.days === null || s.days >= 7 ? 2 : 0) + (s.note ? 1 : 0);
  };
  const sorted = [...accepted].sort((a, b) => score(b) - score(a) || a.profile.lastName.localeCompare(b.profile.lastName, 'cs'));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
      <T v="small" muted>
        {plural(settings.lang, 'athlete', accepted.length)}
      </T>
      {sorted.map((m) => {
        const s = memberSummary(m);
        // poslední záznam regenerace za 2 dny (jen se souhlasem svěřence)
        const twoDays = toISODate(addDays(new Date(), -2));
        const well =
          [...m.recentWellness].filter((w) => w.date >= twoDays).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
        const name = `${m.profile.firstName} ${m.profile.lastName}`.trim();
        const stale = s.days === null || s.days >= 7;
        const unreadCount = Object.entries(unread)
          .filter(([k]) => k.startsWith(`${m.profile.id}:`))
          .reduce((a, [, n]) => a + n, 0);
        return (
          <PressScale
            key={m.profile.id}
            onPress={() => router.push(`/team/${m.profile.id}`)}
            scaleTo={0.98}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: stale ? colors.accent : colors.border,
              padding: 14,
              gap: 10,
            }}
          >
            <Row gap={12}>
              <Avatar uri={m.profile.avatarUrl} name={name} size={46} />
              <View style={{ flex: 1 }}>
                <T v="h3" numberOfLines={1}>
                  {name}
                </T>
                <T v="caption" muted numberOfLines={1}>
                  {[
                    m.profile.weightCategory ? `${m.profile.weightCategory} kg` : null,
                    m.profile.ageGroup ? ageGroupLabel(m.profile.ageGroup, m.profile.gender, settings.lang) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </T>
              </View>
              {unreadCount > 0 && (
                <Row
                  gap={4}
                  style={{ backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}
                >
                  <Ionicons name="chatbubble" size={12} color="#FFF" />
                  <T v="caption" color="#FFF" style={{ fontFamily: FONTS.bold }}>
                    {unreadCount}
                  </T>
                </Row>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Row>
            <Row style={{ backgroundColor: colors.bg, borderRadius: 12, paddingVertical: 8 }} gap={0}>
              <Mini
                label={t('coach.lastWorkout')}
                value={s.days === null ? '—' : s.days === 0 ? t('common.today') : t('coach.daysAgo', { n: s.days })}
                danger={stale}
              />
              <Mini label={t('coach.thisWeek')} value={String(s.thisWeek)} />
              <Mini label={t('coach.lastRpe')} value={s.last?.rpe ? String(s.last.rpe).replace('.', ',') : '—'} />
              {well ? (
                <Mini label={t('well.readiness')} value={String(readiness(well))} danger={readiness(well) < 45} />
              ) : (
                <Mini
                  label={t('tr.log.feeling')}
                  value={
                    s.last?.feeling
                      ? t(`tr.feeling.${s.last.feeling}` as TKey).replace(/[^\p{Extended_Pictographic}]/gu, '') || '—'
                      : '—'
                  }
                />
              )}
            </Row>
            {well?.pain ? (
              <Row gap={8}>
                <Ionicons name="bandage-outline" size={17} color={colors.accent} />
                <T v="small" color={colors.accent} style={{ flex: 1 }}>
                  {t('well.painOf', { area: t(`well.area.${well.pain.area}` as TKey), level: well.pain.level })}
                </T>
              </Row>
            ) : null}
            {s.note ? (
              <Row gap={8} style={{ alignItems: 'flex-start' }}>
                <Ionicons name="alert-circle" size={17} color={colors.accent} style={{ marginTop: 1 }} />
                <T v="small" style={{ flex: 1, fontStyle: 'italic' }} numberOfLines={2}>
                  „{s.note.notes?.trim()}“
                </T>
              </Row>
            ) : null}
          </PressScale>
        );
      })}

      {pending.length > 0 && (
        <View style={{ gap: 8, marginTop: 8 }}>
          <T v="label" muted>
            {t('coach.pendingInvites')}
          </T>
          {pending.map((m) => {
            const name = `${m.profile.firstName} ${m.profile.lastName}`.trim();
            return (
              <Card key={m.profile.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar uri={m.profile.avatarUrl} name={name} size={38} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '700' }}>{name}</T>
                  <T v="caption" muted>
                    {t('coach.waiting')}
                  </T>
                </View>
                <Button
                  small
                  kind="ghost"
                  title={t('common.cancel')}
                  onPress={async () => {
                    if (!(await confirm(t('coach.cancelInviteQ', { name }), { ok: t('common.yes'), cancel: t('common.no') })))
                      return;
                    await api.removeCoachLink(session?.userId ?? '', m.profile.id).catch(() => {});
                    onChange();
                  }}
                />
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function Mini({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  const { colors } = useSettings();
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 2 }}>
      <T style={{ fontFamily: FONTS.black, fontSize: 15 }} color={danger ? colors.accent : undefined} numberOfLines={1}>
        {value}
      </T>
      <T v="caption" muted numberOfLines={1} style={{ fontSize: 11 }}>
        {label}
      </T>
    </View>
  );
}

/* ------------------------------ Skupiny ------------------------------ */

function Groups({ team, groups }: { team: TeamMember[]; groups: CoachGroup[] }) {
  const { t, colors, settings } = useSettings();
  const byId = new Map(team.map((m) => [m.profile.id, m]));
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
      <T v="small" muted>
        {t('coach.groupsHint')}
      </T>
      <Button icon="add" title={t('coach.newGroup')} onPress={() => router.push('/team/group/new')} />
      {groups.map((g) => (
        <Card key={g.id} onPress={() => router.push(`/team/group/${g.id}`)} style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h3">{g.name}</T>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Row>
          <T v="small" muted>
            {plural(settings.lang, 'athlete', g.memberIds.length)}
          </T>
          <View style={{ flexDirection: 'row' }}>
            {g.memberIds.slice(0, 8).map((id, i) => {
              const m = byId.get(id);
              return m ? (
                <View key={id} style={{ marginLeft: i ? -8 : 0 }}>
                  <Avatar uri={m.profile.avatarUrl} name={`${m.profile.firstName} ${m.profile.lastName}`} size={30} ring />
                </View>
              ) : null;
            })}
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

/* ------------------------------ Žebříček ------------------------------ */

function Ranking({ team, groups }: { team: TeamMember[]; groups: CoachGroup[] }) {
  const { t, colors, settings } = useSettings();
  const [group, setGroup] = useState<string | null>(null);
  const [mode, setMode] = useState<'tonnage' | 'count' | 'sinclair'>('tonnage');
  const members = team
    .filter((m) => m.status === 'accepted')
    .filter((m) => !group || groups.find((g) => g.id === group)?.memberIds.includes(m.profile.id));
  const rows = members
    .map((m) => {
      const ms = monthStats(m.recentLogs);
      const total = (m.profile.prSnatch ?? 0) + (m.profile.prCleanJerk ?? 0);
      const sin =
        total && m.profile.gender && m.profile.bodyweight ? sinclairTotal(m.profile.gender, m.profile.bodyweight, total) : null;
      return { m, value: mode === 'tonnage' ? ms.tonnage : mode === 'count' ? ms.count : (sin ?? -1) };
    })
    .sort((a, b) => b.value - a.value);
  const fmt = (v: number) =>
    v < 0 ? '—' : mode === 'tonnage' ? formatTonnage(v, settings.unit) : mode === 'count' ? String(v) : formatNumber(v, 1);
  const medal = ['#F1B100', '#A8B3C2', '#C8814A'];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { key: 'tonnage', label: t('coach.rankTonnage') },
          { key: 'count', label: t('coach.rankCount') },
          { key: 'sinclair', label: 'Sinclair' },
        ]}
      />
      {groups.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label={t('coach.everyone')} on={!group} onPress={() => setGroup(null)} />
          {groups.map((g) => (
            <Chip key={g.id} label={g.name} on={group === g.id} onPress={() => setGroup(g.id)} />
          ))}
        </ScrollView>
      )}
      <T v="small" muted>
        {mode === 'sinclair' ? t('coach.rankSinclairHint') : t('coach.rankMonthHint')}
      </T>
      {rows.length === 0 ? (
        <Empty icon="trophy-outline" text={t('coach.rankEmpty')} />
      ) : (
        rows.map(({ m, value }, i) => (
          <Card
            key={m.profile.id}
            onPress={() => router.push(`/team/${m.profile.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: i < 3 && value > 0 ? medal[i] : colors.primarySoft,
              }}
            >
              <T style={{ fontFamily: FONTS.black }} color={i < 3 && value > 0 ? '#FFF' : colors.primary}>
                {i + 1}
              </T>
            </View>
            <Avatar uri={m.profile.avatarUrl} name={`${m.profile.firstName} ${m.profile.lastName}`} size={36} />
            <T style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>
              {m.profile.firstName} {m.profile.lastName}
            </T>
            <T style={{ fontFamily: FONTS.black, fontSize: 17 }}>{fmt(value)}</T>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
