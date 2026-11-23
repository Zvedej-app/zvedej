import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { Avatar, Empty, Header, IconButton, Loading, Row, Screen, Segmented, T } from '../components/ui';
import { api } from '../lib/api';
import { useSession } from '../hooks/useSession';
import type { Conversation } from '../lib/types';
import { useSettings } from '../providers/SettingsProvider';

export default function MessagesScreen() {
  const { t, colors, locale } = useSettings();
  const me = useSession();
  const [tab, setTab] = useState<'inbox' | 'requests'>('inbox');
  const [list, setList] = useState<Conversation[] | null>(null);

  const load = useCallback(() => {
    api.listConversations().then(setList).catch(() => setList([]));
  }, []);
  useFocusEffect(load);
  useEffect(() => {
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  const inbox = (list ?? []).filter((c) => !c.isRequest);
  const requests = (list ?? []).filter((c) => c.isRequest);
  const shown = tab === 'inbox' ? inbox : requests;
  const reqUnread = requests.reduce((a, c) => a + c.unread, 0);

  const time = (iso: string) => {
    const d = new Date(iso);
    const sameDay = d.toDateString() === new Date().toDateString();
    return new Intl.DateTimeFormat(locale, sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'numeric' }).format(d);
  };

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('soc.messages')}
        right={<IconButton name="people-outline" onPress={() => router.push('/friends')} label={t('soc.friends')} />}
      />
      <View style={{ padding: 16, paddingBottom: 6 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'inbox', label: t('soc.messages') },
            { key: 'requests', label: `${t('soc.messageRequests')}${reqUnread ? ` (${reqUnread})` : ''}` },
          ]}
        />
      </View>
      {list === null ? (
        <Loading />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(c) => c.user.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          ListEmptyComponent={
            <Empty icon="chatbubbles-outline" text={tab === 'inbox' ? t('soc.noMessages') : t('soc.noMessageRequests')} />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/chat/${item.user.id}`)} style={{ paddingVertical: 8 }}>
              <Row gap={12}>
                <Avatar uri={item.user.avatarUrl} name={`${item.user.firstName} ${item.user.lastName}`} size={52} />
                <View style={{ flex: 1 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T style={{ fontSize: 16, fontWeight: item.unread ? '800' : '700', flex: 1 }} numberOfLines={1}>
                      {item.user.firstName} {item.user.lastName}
                    </T>
                    <T v="caption" muted>
                      {time(item.last.createdAt)}
                    </T>
                  </Row>
                  <T v="small" muted={!item.unread} numberOfLines={1} style={item.unread ? { fontWeight: '700' } : undefined}>
                    {item.last.senderId === me ? t('soc.you') : ''}
                    {item.last.body}
                  </T>
                </View>
                {item.unread > 0 && (
                  <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                    <T v="caption" color="#FFF" style={{ fontWeight: '800' }}>
                      {item.unread}
                    </T>
                  </View>
                )}
              </Row>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}
