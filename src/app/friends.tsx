import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { ClubBadge } from '../components/ClubBadge';
import { Avatar, Button, Empty, Header, IconButton, Loading, Row, Screen, Segmented, T } from '../components/ui';
import { api } from '../lib/api';
import { getClub } from '../lib/clubs';
import { confirm } from '../lib/dialog';
import type { FriendsOverview, Profile } from '../lib/types';
import { useSettings } from '../providers/SettingsProvider';

export default function FriendsScreen() {
  const { t, colors } = useSettings();
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const [data, setData] = useState<FriendsOverview | null>(null);

  const load = useCallback(() => {
    api
      .friendsOverview()
      .then(setData)
      .catch(() => setData({ friends: [], incoming: [], outgoing: [] }));
  }, []);
  useFocusEffect(load);

  const respond = async (id: string, accept: boolean) => {
    await api.respondFriendRequest(id, accept).catch(() => {});
    load();
  };

  const person = (p: Profile, actions?: React.ReactNode, sub?: string) => {
    const club = getClub(p.clubId);
    return (
      <Row style={{ paddingVertical: 8 }} gap={12}>
        <Pressable onPress={() => router.push(`/user/${p.id}`)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar uri={p.avatarUrl} name={`${p.firstName} ${p.lastName}`} size={48} />
          <View style={{ flex: 1 }}>
            <T style={{ fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
              {p.firstName} {p.lastName}
            </T>
            {club && (
              <Row gap={6}>
                <ClubBadge club={club} size={16} />
                <T v="small" muted numberOfLines={1} style={{ flex: 1 }}>
                  {club.name}
                </T>
              </Row>
            )}
            {sub ? (
              <T v="caption" color={colors.accent} style={{ fontWeight: '700' }}>
                {sub}
              </T>
            ) : null}
          </View>
        </Pressable>
        {actions}
      </Row>
    );
  };

  const incoming = data?.incoming ?? [];
  const requests = data
    ? [...data.incoming.map((p) => ({ p, kind: 'in' as const })), ...data.outgoing.map((p) => ({ p, kind: 'out' as const }))]
    : [];

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('soc.friends')}
        right={<IconButton name="chatbubbles-outline" onPress={() => router.push('/messages')} label={t('soc.messages')} />}
      />
      <View style={{ padding: 16, paddingBottom: 6 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'friends', label: `${t('soc.friends')}${data ? ` (${data.friends.length})` : ''}` },
            { key: 'requests', label: `${t('soc.requests')}${incoming.length ? ` (${incoming.length})` : ''}` },
          ]}
        />
      </View>
      {!data ? (
        <Loading />
      ) : tab === 'friends' ? (
        <FlatList
          data={data.friends}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          ListEmptyComponent={<Empty icon="people-outline" text={t('soc.noFriends')} />}
          renderItem={({ item }) =>
            person(
              item,
              <Row gap={2}>
                <IconButton name="chatbubble-ellipses-outline" onPress={() => router.push(`/chat/${item.id}`)} label={t('soc.message')} />
                <IconButton
                  name="person-remove-outline"
                  color={colors.textMuted}
                  label={t('soc.removeFriend')}
                  onPress={async () => {
                    if (!(await confirm(t('soc.removeFriendQ'), { ok: t('soc.removeFriend'), cancel: t('common.cancel'), destructive: true }))) return;
                    await api.removeFriend(item.id).catch(() => {});
                    load();
                  }}
                />
              </Row>,
            )
          }
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(x) => x.kind + x.p.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          ListEmptyComponent={<Empty icon="mail-open-outline" text={t('soc.noRequests')} />}
          renderItem={({ item }) =>
            person(
              item.p,
              item.kind === 'in' ? (
                <Row gap={6}>
                  <Button small title={t('soc.accept')} onPress={() => respond(item.p.id, true)} />
                  <Button small kind="secondary" title={t('soc.decline')} onPress={() => respond(item.p.id, false)} />
                </Row>
              ) : (
                <Button
                  small
                  kind="ghost"
                  title={t('common.cancel')}
                  onPress={async () => {
                    await api.removeFriend(item.p.id).catch(() => {});
                    load();
                  }}
                />
              ),
              item.kind === 'in' ? t('soc.incoming') : t('soc.requestSent'),
            )
          }
        />
      )}
    </Screen>
  );
}
