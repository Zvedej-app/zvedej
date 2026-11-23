import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Avatar, Banner, Header, IconButton, Row, Screen, T } from '../../components/ui';
import { useSession } from '../../hooks/useSession';
import { api } from '../../lib/api';
import { notify } from '../../lib/dialog';
import { useBottomInset } from '../../lib/insets';
import { radius } from '../../lib/theme';
import type { FriendStatus, Message, Profile } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors, locale } = useSettings();
  const me = useSession();
  const bottom = useBottomInset();
  const [user, setUser] = useState<Profile | null>(null);
  const [status, setStatus] = useState<FriendStatus>('none');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    let alive = true;
    api.getProfile(id).then((p) => alive && setUser(p)).catch(() => {});
    api.friendStatus(id).then((s) => alive && setStatus(s)).catch(() => {});
    const poll = async () => {
      try {
        const list = await api.listMessages(id);
        if (!alive) return;
        setMessages(list);
        if (list.some((m) => m.recipientId === me && !m.readAt)) api.markRead(id).catch(() => {});
      } catch {}
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [id, me]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const m = await api.sendMessage(id, body);
      setMessages((l) => [...l, m]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      notify(String((e as Error)?.message).includes('MESSAGE_REQUEST_LIMIT') ? t('soc.limit') : t('common.error'));
    } finally {
      setSending(false);
    }
  };

  const theyWrote = messages.some((m) => m.senderId === id);
  const name = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        center={
          <Pressable onPress={() => router.push(`/user/${id}`)}>
            <Row gap={8}>
              <Avatar uri={user?.avatarUrl} name={name} size={30} />
              <T v="h3" numberOfLines={1}>
                {name}
              </T>
            </Row>
          </Pressable>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={status !== 'friends' ? <Banner text={theyWrote ? t('soc.requestHint') : t('soc.notFriendHint')} /> : undefined}
          renderItem={({ item }) => {
            const mine = item.senderId === me;
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <View
                  style={{
                    maxWidth: '82%',
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: 18,
                    borderBottomRightRadius: mine ? 4 : 18,
                    borderBottomLeftRadius: mine ? 18 : 4,
                    backgroundColor: mine ? colors.primary : colors.surface,
                    borderWidth: mine ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <T color={mine ? '#FFF' : undefined} style={{ fontSize: 15.5, lineHeight: 21 }} selectable>
                    {item.body}
                  </T>
                </View>
                <T v="caption" muted style={{ marginTop: 2, marginHorizontal: 6 }}>
                  {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAt))}
                </T>
              </View>
            );
          }}
        />
        <Row style={{ padding: 12, paddingBottom: 12 + (Platform.OS === 'web' ? 0 : bottom), borderTopWidth: 1, borderTopColor: colors.border }} gap={8}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('soc.writeMessage')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            style={{
              flex: 1,
              maxHeight: 110,
              minHeight: 44,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              color: colors.text,
              paddingHorizontal: 16,
              paddingTop: 11,
              paddingBottom: 11,
              fontSize: 16,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('soc.send')}
            onPress={send}
            disabled={!text.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? colors.accent : colors.border, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="send" size={19} color="#FFF" />
          </Pressable>
        </Row>
      </KeyboardAvoidingView>
    </Screen>
  );
}
