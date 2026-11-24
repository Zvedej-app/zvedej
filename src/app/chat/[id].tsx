import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { ReportSheet, type ReportTarget } from '../../components/safety/ReportSheet';
import { UserSafetyMenu } from '../../components/safety/UserSafetyMenu';
import { Avatar, Banner, Header, IconButton, Row, Screen, T } from '../../components/ui';
import { useSession } from '../../hooks/useSession';
import { api } from '../../lib/api';
import { confirm, notify } from '../../lib/dialog';
import { useBottomInset } from '../../lib/insets';
import { radius } from '../../lib/theme';
import type { FriendStatus, Message, Profile } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';
import { GuestGate } from '../../components/GuestGate';
import { useAuth } from '../../providers/AuthProvider';

export default function ChatScreen() {
  const { session: guestSession } = useAuth();
  if (guestSession?.isAnonymous) return <GuestGate />;
  return <ChatScreenInner />;
}

function ChatScreenInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors, locale } = useSettings();
  const me = useSession();
  const bottom = useBottomInset();
  const [user, setUser] = useState<Profile | null>(null);
  const [status, setStatus] = useState<FriendStatus>('none');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const onBlockedChange = useCallback((b: boolean) => setBlocked(b), []);

  // podržením cizí zprávy ji lze nahlásit
  const askReport = async (m: Message) => {
    if (m.senderId === me) return;
    const ok = await confirm(t('safety.reportMessageQ'), {
      ok: t('safety.report'),
      cancel: t('common.cancel'),
      destructive: true,
    });
    if (ok) setReport({ kind: 'message', messageId: m.id, userId: m.senderId });
  };

  useEffect(() => {
    let alive = true;
    api
      .getProfile(id)
      .then((p) => alive && setUser(p))
      .catch(() => {});
    api
      .friendStatus(id)
      .then((s) => alive && setStatus(s))
      .catch(() => {});
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
      const msg = String((e as Error)?.message);
      notify(
        msg.includes('MESSAGE_REQUEST_LIMIT')
          ? t('soc.limit')
          : msg.includes('BLOCKED')
            ? t('safety.blockedChat')
            : msg.includes('MINOR_PROTECTED')
              ? t('safety.minorProtected')
              : msg.includes('BANNED')
                ? t('notice.banned')
                : t('common.error'),
      );
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
        right={user ? <UserSafetyMenu userId={id} name={name} onBlockedChange={onBlockedChange} /> : undefined}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={{ gap: 8 }}>
              {status !== 'friends' && <Banner text={theyWrote ? t('soc.requestHint') : t('soc.notFriendHint')} />}
              {theyWrote && (
                <T v="caption" muted style={{ textAlign: 'center' }}>
                  {t('safety.longPressHint')}
                </T>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.senderId === me;
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <Pressable
                  onLongPress={mine ? undefined : () => askReport(item)}
                  delayLongPress={450}
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
                </Pressable>
                <T v="caption" muted style={{ marginTop: 2, marginHorizontal: 6 }}>
                  {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAt))}
                </T>
              </View>
            );
          }}
        />
        {blocked ? (
          <View
            style={{
              padding: 16,
              paddingBottom: 16 + (Platform.OS === 'web' ? 0 : bottom),
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <T muted style={{ textAlign: 'center' }}>
              {t('safety.blockedChat')}
            </T>
          </View>
        ) : (
          <Row
            style={{
              padding: 12,
              paddingBottom: 12 + (Platform.OS === 'web' ? 0 : bottom),
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
            gap={8}
          >
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
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: text.trim() ? colors.accent : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="send" size={19} color="#FFF" />
            </Pressable>
          </Row>
        )}
      </KeyboardAvoidingView>
      <ReportSheet target={report} onClose={() => setReport(null)} onDone={(b) => b && setBlocked(true)} />
    </Screen>
  );
}
