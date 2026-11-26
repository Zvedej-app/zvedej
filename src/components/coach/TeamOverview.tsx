import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { teamToday, type TeamTodayRow } from '../../lib/coach';
import { formatDate, parseISODate, todayISO, weekdayMon0 } from '../../lib/date';
import type { TKey } from '../../lib/i18n';
import { FONTS } from '../../lib/theme';
import { logSetCount, logTonnage } from '../../lib/training';
import type { TeamMember } from '../../lib/types';
import { formatNumber } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { formatTonnage } from '../training/format';
import { Avatar, PressScale, Row, T, type IconName } from '../ui';

const ORANGE = '#E07A00';

/** Trenér: celý tým na jedné obrazovce – bolest, nízká připravenost, vynechané tréninky, dnešní tréninky. */
export function TeamOverview({ team }: { team: TeamMember[] }) {
  const { t, colors, settings, locale } = useSettings();
  const o = teamToday(team);
  const name = (r: TeamTodayRow) => `${r.member.profile.firstName} ${r.member.profile.lastName}`.trim();
  const dayText = (iso: string) => {
    const diff = Math.round((parseISODate(todayISO()).getTime() - parseISODate(iso).getTime()) / 86400000);
    return diff === 1 ? t('team.yesterday') : t(`tr.weekdayFull.${weekdayMon0(parseISODate(iso))}` as TKey);
  };

  const all = o.pain.length + o.lowReadiness.length + o.missed.length + o.inactive.length;
  const attention = new Set([...o.pain, ...o.lowReadiness].map((r) => r.member.profile.id)).size;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 48 }}>
      {/* souhrn dne */}
      <View style={{ backgroundColor: colors.primary, borderRadius: 20, padding: 16, gap: 12 }}>
        <T v="caption" color="rgba(255,255,255,0.75)" style={{ fontFamily: FONTS.bold, letterSpacing: 0.6 }}>
          {formatDate(todayISO(), locale, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
        </T>
        <Row style={{ justifyContent: 'space-between' }}>
          <Big value={`${o.trainedToday.length}/${o.total}`} label={t('team.trainedToday')} />
          <Big value={String(o.plannedToday.length)} label={t('team.stillPlanned')} />
          <Big
            value={String(attention)}
            label={t('team.needAttention')}
            warn={attention > 0}
          />
        </Row>
      </View>

      {o.total === 0 && (
        <T muted style={{ textAlign: 'center' }}>
          {t('coach.emptyTeam')}
        </T>
      )}

      <Section icon="bandage" color={colors.danger} title={t('team.pain')} rows={o.pain}>
        {(r) => (
          <Item key={r.member.profile.id} r={r} name={name(r)} color={colors.danger}>
            {r.pain?.area
              ? t('well.painOf', { area: t(`well.area.${r.pain.area}` as TKey), level: r.pain.level ?? 0 })
              : t('team.feltBad')}
            {r.pain?.note ? ` · „${r.pain.note}“` : ''}
          </Item>
        )}
      </Section>

      <Section icon="battery-dead" color={ORANGE} title={t('team.lowReadiness')} rows={o.lowReadiness}>
        {(r) => (
          <Item key={r.member.profile.id} r={r} name={name(r)} color={ORANGE} badge={String(r.readiness)}>
            {r.wellness
              ? `${t('well.sleep')} ${r.wellness.sleepHours === null ? '—' : formatNumber(r.wellness.sleepHours, 1)} h · ${t('well.energy')} ${r.wellness.energy}/5`
              : ''}
          </Item>
        )}
      </Section>

      <Section icon="calendar-clear" color={colors.accent} title={t('team.missed')} rows={o.missed}>
        {(r) => (
          <Item key={r.member.profile.id} r={r} name={name(r)} color={colors.accent}>
            {r.missed.map(dayText).join(', ')}
          </Item>
        )}
      </Section>

      <Section icon="checkmark-circle" color={colors.success} title={t('team.trained')} rows={o.trainedToday}>
        {(r) => (
          <Item key={r.member.profile.id} r={r} name={name(r)} color={colors.success}>
            {r.today
              .map(
                (l) =>
                  `${l.title} · ${logSetCount(l)} ${t('tr.set').toLowerCase()} · ${formatTonnage(logTonnage(l), settings.unit)}${l.rpe ? ` · RPE ${l.rpe}` : ''}`,
              )
              .join('\n')}
          </Item>
        )}
      </Section>

      <Section icon="time" color={colors.primary} title={t('team.planned')} rows={o.plannedToday}>
        {(r) => (
          <Item key={r.member.profile.id} r={r} name={name(r)} color={colors.primary}>
            {t('team.notYet')}
          </Item>
        )}
      </Section>

      <Section icon="moon" color={colors.textMuted} title={t('team.inactive')} rows={o.inactive}>
        {(r) => (
          <Item key={r.member.profile.id} r={r} name={name(r)} color={colors.textMuted}>
            {r.days === null ? t('team.noRecent') : t('coach.daysAgo', { n: r.days })}
          </Item>
        )}
      </Section>

      {o.total > 0 && all === 0 && (
        <Row gap={8} style={{ justifyContent: 'center' }}>
          <Ionicons name="happy-outline" size={20} color={colors.success} />
          <T muted>{t('team.allGood')}</T>
        </Row>
      )}
      <T v="caption" muted style={{ textAlign: 'center' }}>
        {t('team.hint')}
      </T>
    </ScrollView>
  );
}

function Big({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <T style={{ fontSize: 26, fontFamily: FONTS.black, color: warn ? '#FFB4B6' : '#FFFFFF' }}>{value}</T>
      <T v="caption" color="rgba(255,255,255,0.8)" style={{ textAlign: 'center' }}>
        {label}
      </T>
    </View>
  );
}

function Section({
  icon,
  color,
  title,
  rows,
  children,
}: {
  icon: IconName;
  color: string;
  title: string;
  rows: TeamTodayRow[];
  children: (r: TeamTodayRow) => React.ReactNode;
}) {
  if (!rows.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Row gap={8}>
        <Ionicons name={icon} size={18} color={color} />
        <T v="h3" style={{ flex: 1 }}>
          {title}
        </T>
        <T v="small" muted style={{ fontFamily: FONTS.bold }}>
          {rows.length}
        </T>
      </Row>
      {rows.map(children)}
    </View>
  );
}

function Item({
  r,
  name,
  color,
  badge,
  children,
}: {
  r: TeamTodayRow;
  name: string;
  color: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const { colors } = useSettings();
  return (
    <PressScale
      onPress={() => router.push(`/team/${r.member.profile.id}`)}
      scaleTo={0.98}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: color,
        padding: 12,
      }}
    >
      <Avatar uri={r.member.profile.avatarUrl} name={name} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <T style={{ fontFamily: FONTS.bold }} numberOfLines={1}>
          {name}
        </T>
        <T v="small" muted numberOfLines={3}>
          {children}
        </T>
      </View>
      {badge ? (
        <View style={{ minWidth: 36, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: color }}>
          <T v="small" color="#FFF" style={{ fontFamily: FONTS.black, textAlign: 'center' }}>
            {badge}
          </T>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </PressScale>
  );
}
