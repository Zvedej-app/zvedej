import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Avatar, Banner, Button, Chip, Empty, Header, IconButton, Loading, Row, Screen, T } from '../../../components/ui';
import { api } from '../../../lib/api';
import { notify, toast } from '../../../lib/dialog';
import { plural } from '../../../lib/i18n';
import type { CoachGroup, TeamMember } from '../../../lib/types';
import { useSettings } from '../../../providers/SettingsProvider';
import { useTraining } from '../../../providers/TrainingProvider';

/** Trenér: poslání plánu vybraným svěřencům nebo celé skupině. */
export default function AssignScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { t, colors, settings } = useSettings();
  const training = useTraining();
  const plan = training.data.plans.find((p) => p.id === planId);
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [groups, setGroups] = useState<CoachGroup[]>([]);
  const [already, setAlready] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .coachTeam()
      .then((tm) => setTeam(tm.filter((m) => m.status === 'accepted')))
      .catch(() => setTeam([]));
    api
      .listGroups()
      .then(setGroups)
      .catch(() => {});
    api
      .planAssignees(planId)
      .then((ids) => setAlready(new Set(ids)))
      .catch(() => {});
  }, [planId]);

  if (!plan) return null;
  const usesKg = plan.days.some((d) => d.exercises.some((e) => e.schemes.some((s) => s.load.type === 'kg')));
  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const send = async () => {
    if (!picked.size) return;
    setBusy(true);
    try {
      await api.assignPlan(plan, [...picked]);
      toast(t('coach.planSent', { n: picked.size }));
      router.back();
    } catch {
      notify(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header
        left={<IconButton name="close" onPress={() => router.back()} label={t('common.back')} />}
        title={t('coach.sendPlan')}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <T v="h2">{plan.name}</T>
        {usesKg ? (
          <Banner icon="barbell-outline" text={t('coach.kgHint')} />
        ) : (
          <Banner icon="person-outline" text={t('coach.pctHint')} />
        )}
        {groups.length > 0 && (
          <View style={{ gap: 8 }}>
            <T v="label" muted>
              {t('coach.wholeGroup')}
            </T>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {groups.map((g) => (
                <Chip
                  key={g.id}
                  icon="people-outline"
                  label={`${g.name} (${g.memberIds.length})`}
                  on={g.memberIds.length > 0 && g.memberIds.every((m) => picked.has(m))}
                  onPress={() =>
                    setPicked((s) => {
                      const all = g.memberIds.every((m) => s.has(m));
                      const n = new Set(s);
                      for (const m of g.memberIds) {
                        if (all) n.delete(m);
                        else n.add(m);
                      }
                      return n;
                    })
                  }
                />
              ))}
            </Row>
          </View>
        )}
        <T v="label" muted>
          {t('coach.athletes')}
        </T>
        {team === null ? (
          <Loading />
        ) : team.length === 0 ? (
          <Empty icon="people-outline" text={t('coach.emptyTeam')} />
        ) : (
          team.map((m) => {
            const on = picked.has(m.profile.id);
            const has = already.has(m.profile.id);
            const name = `${m.profile.firstName} ${m.profile.lastName}`.trim();
            return (
              <Pressable
                key={m.profile.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => toggle(m.profile.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: on ? colors.primary : colors.border,
                  backgroundColor: on ? colors.primarySoft : colors.surface,
                }}
              >
                <Avatar uri={m.profile.avatarUrl} name={name} size={36} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontWeight: '700' }}>{name}</T>
                  {has && (
                    <T v="caption" color={colors.success}>
                      {t('coach.alreadyHas')}
                    </T>
                  )}
                </View>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.primary : colors.textMuted} />
              </Pressable>
            );
          })
        )}
      </ScrollView>
      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button
          icon="paper-plane"
          title={picked.size ? `${t('coach.send')} · ${plural(settings.lang, 'athlete', picked.size)}` : t('coach.pickAthletes')}
          disabled={!picked.size}
          loading={busy}
          onPress={send}
        />
      </View>
    </Screen>
  );
}
