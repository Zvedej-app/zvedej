import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Avatar, Button, Empty, Field, Header, IconButton, Loading, Screen, T } from '../../../components/ui';
import { api } from '../../../lib/api';
import { confirm, notify } from '../../../lib/dialog';
import type { CoachGroup, TeamMember } from '../../../lib/types';
import { useSettings } from '../../../providers/SettingsProvider';

/** Trenér: vytvoření nebo úprava skupiny svěřenců. */
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors } = useSettings();
  const isNew = id === 'new';
  const [group, setGroup] = useState<CoachGroup>({ id: 'new', name: '', memberIds: [] });
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .coachTeam()
      .then((tm) => setTeam(tm.filter((m) => m.status === 'accepted')))
      .catch(() => setTeam([]));
    if (!isNew)
      api
        .listGroups()
        .then((gs) => {
          const g = gs.find((x) => x.id === id);
          if (g) setGroup(g);
        })
        .catch(() => {});
  }, [id, isNew]);

  const toggle = (aid: string) =>
    setGroup((g) => ({
      ...g,
      memberIds: g.memberIds.includes(aid) ? g.memberIds.filter((x) => x !== aid) : [...g.memberIds, aid],
    }));

  const save = async () => {
    if (!group.name.trim()) return notify(t('coach.groupNameRequired'));
    setBusy(true);
    try {
      await api.saveGroup(group);
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
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={isNew ? t('coach.newGroup') : t('coach.editGroup')}
        right={<Button small title={t('common.save')} onPress={save} loading={busy} />}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Field
          label={t('coach.groupName')}
          placeholder={t('coach.groupNamePh')}
          value={group.name}
          onChangeText={(name) => setGroup((g) => ({ ...g, name }))}
          maxLength={60}
        />
        <T v="label" muted>
          {t('coach.members')} ({group.memberIds.length})
        </T>
        {team === null ? (
          <Loading />
        ) : team.length === 0 ? (
          <Empty icon="people-outline" text={t('coach.emptyTeam')} />
        ) : (
          team.map((m) => {
            const on = group.memberIds.includes(m.profile.id);
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
                <T style={{ flex: 1, fontWeight: '700' }}>{name}</T>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={24} color={on ? colors.primary : colors.textMuted} />
              </Pressable>
            );
          })
        )}
        {!isNew && (
          <View style={{ marginTop: 12 }}>
            <Button
              kind="ghost"
              icon="trash-outline"
              title={t('coach.deleteGroup')}
              onPress={async () => {
                if (
                  !(await confirm(t('coach.deleteGroupQ'), {
                    ok: t('common.delete'),
                    cancel: t('common.cancel'),
                    destructive: true,
                  }))
                )
                  return;
                await api.deleteGroup(group.id).catch(() => {});
                router.back();
              }}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
