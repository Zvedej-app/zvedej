import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { api } from '../../lib/api';
import { confirm, notify } from '../../lib/dialog';
import { FONTS, radius } from '../../lib/theme';
import type { TrainingVideo, WorkoutComment } from '../../lib/types';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { Avatar, Button, Card, Row, T } from '../ui';

const MAX_MB = 80;

/**
 * Zpětná vazba k tréninku: komentáře svěřence a trenéra a videa nástupů.
 * Svěřenec může videa nahrávat, trenér je jen přehrává a komentuje.
 */
export function LogFeedback({ athleteId, logId }: { athleteId: string; logId: string }) {
  const { t, colors, locale } = useSettings();
  const { session } = useAuth();
  const me = session?.userId ?? '';
  const isAthlete = me === athleteId;
  const [comments, setComments] = useState<WorkoutComment[] | null>(null);
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    api
      .listComments(athleteId, logId)
      .then(setComments)
      .catch(() => setComments([]));
    api
      .listTrainingVideos(athleteId, logId)
      .then(setVideos)
      .catch(() => {});
    api.markCommentsRead(athleteId, logId).catch(() => {});
  }, [athleteId, logId]);
  useEffect(load, [load]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const c = await api.addComment(athleteId, logId, body);
      setComments((l) => [...(l ?? []), c]);
      setText('');
    } catch {
      notify(t('common.error'));
    } finally {
      setSending(false);
    }
  };

  const addVideo = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], videoMaxDuration: 60 });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    if (a.fileSize && a.fileSize > MAX_MB * 1024 * 1024) return notify(t('ch.tooBig', { mb: MAX_MB }));
    setUploading(true);
    try {
      const v = await api.uploadTrainingVideo(athleteId, logId, a.uri, a.mimeType ?? 'video/mp4');
      setVideos((l) => [...l, v]);
    } catch {
      notify(t('common.error'));
    } finally {
      setUploading(false);
    }
  };

  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
      new Date(iso),
    );

  return (
    <View style={{ gap: 12 }}>
      {/* videa nástupů */}
      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={8}>
            <Ionicons name="videocam" size={18} color={colors.primary} />
            <T v="h3">{t('coach.videos')}</T>
          </Row>
          {isAthlete && (
            <Button small kind="secondary" icon="add" title={t('coach.addVideo')} onPress={addVideo} loading={uploading} />
          )}
        </Row>
        {videos.length === 0 ? (
          <T v="small" muted>
            {isAthlete ? t('coach.videosHintAthlete') : t('coach.videosEmpty')}
          </T>
        ) : (
          videos.map((v) => (
            <View key={v.id} style={{ gap: 6 }}>
              <VideoBox uri={v.url} />
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="caption" muted>
                  {time(v.createdAt)}
                </T>
                {isAthlete && (
                  <Button
                    small
                    kind="ghost"
                    icon="trash-outline"
                    title={t('common.delete')}
                    onPress={async () => {
                      if (
                        !(await confirm(t('common.confirmDelete'), {
                          ok: t('common.delete'),
                          cancel: t('common.cancel'),
                          destructive: true,
                        }))
                      )
                        return;
                      await api.deleteTrainingVideo(v).catch(() => {});
                      setVideos((l) => l.filter((x) => x.id !== v.id));
                    }}
                  />
                )}
              </Row>
            </View>
          ))
        )}
      </Card>

      {/* komentáře */}
      <Card style={{ gap: 12 }}>
        <Row gap={8}>
          <Ionicons name="chatbubbles" size={18} color={colors.primary} />
          <T v="h3">{t('coach.comments')}</T>
        </Row>
        {comments === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : comments.length === 0 ? (
          <T v="small" muted>
            {isAthlete ? t('coach.commentsEmptyAthlete') : t('coach.commentsEmptyCoach')}
          </T>
        ) : (
          comments.map((c) => {
            const mine = c.authorId === me;
            return (
              <View key={c.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <Avatar uri={c.authorAvatar} name={c.authorName} size={32} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Row gap={6}>
                    <T v="small" style={{ fontFamily: FONTS.bold }}>
                      {c.authorName}
                    </T>
                    {c.authorId !== athleteId && (
                      <View
                        style={{ backgroundColor: colors.primarySoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}
                      >
                        <T v="caption" color={colors.primary} style={{ fontFamily: FONTS.bold, fontSize: 10 }}>
                          {t('coach.coachBadge')}
                        </T>
                      </View>
                    )}
                    <T v="caption" muted>
                      {time(c.createdAt)}
                    </T>
                  </Row>
                  <T style={{ lineHeight: 21 }} selectable>
                    {c.body}
                  </T>
                  {mine && (
                    <Pressable
                      onPress={async () => {
                        if (
                          !(await confirm(t('common.confirmDelete'), {
                            ok: t('common.delete'),
                            cancel: t('common.cancel'),
                            destructive: true,
                          }))
                        )
                          return;
                        await api.deleteComment(c.id).catch(() => {});
                        setComments((l) => (l ?? []).filter((x) => x.id !== c.id));
                      }}
                    >
                      <T v="caption" muted>
                        {t('common.delete')}
                      </T>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
        <Row gap={8} style={{ alignItems: 'flex-end' }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={isAthlete ? t('coach.writeAthlete') : t('coach.writeCoach')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.bg,
              color: colors.text,
              paddingHorizontal: 14,
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
      </Card>
    </View>
  );
}

function VideoBox({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return (
    <View style={{ height: 260, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />
    </View>
  );
}
