import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { Banner, Button, Card, Field, Header, IconButton, Row, Screen, T } from '../components/ui';
import { api } from '../lib/api';
import { VIDEO_MAX_MB, VIDEO_MAX_SECONDS } from '../lib/config';
import { currentMonthKey, formatMonth } from '../lib/date';
import type { ChallengeTheme } from '../lib/types';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';
import { GuestGate } from '../components/GuestGate';

interface Picked {
  uri: string;
  mimeType: string;
  durationMs: number | null;
  size: number | null;
}

async function makeThumbnail(uri: string) {
  if (Platform.OS === 'web') return null;
  try {
    const VT = await import('expo-video-thumbnails');
    const r = await VT.getThumbnailAsync(uri, { time: 1000, quality: 0.6 });
    return r.uri;
  } catch {
    return null;
  }
}

export default function UploadScreen() {
  const { session: guestSession } = useAuth();
  if (guestSession?.isAnonymous) return <GuestGate />;
  return <UploadScreenInner />;
}

function UploadScreenInner() {
  const { t, settings, locale } = useSettings();
  const { session } = useAuth();
  const month = currentMonthKey();
  const [theme, setTheme] = useState<ChallengeTheme | null>(null);
  const [already, setAlready] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getTheme(month)
      .then(setTheme)
      .catch(() => {});
    if (session)
      api
        .listUserVideos(session.userId)
        .then((vs) => setAlready(vs.some((v) => v.month === month)))
        .catch(() => {});
  }, [month, session]);

  const choose = async (camera: boolean) => {
    setError(null);
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['videos'],
      videoMaxDuration: VIDEO_MAX_SECONDS,
      allowsEditing: Platform.OS === 'ios', // iOS umožní video rovnou zkrátit
      videoExportPreset: ImagePicker.VideoExportPreset.H264_1920x1080,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
    };
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    const p: Picked = {
      uri: a.uri,
      mimeType: a.mimeType ?? 'video/mp4',
      durationMs: a.duration ?? null,
      size: a.fileSize ?? null,
    };
    if (p.durationMs && p.durationMs / 1000 > VIDEO_MAX_SECONDS + 1) return setError(t('ch.tooLong', { s: VIDEO_MAX_SECONDS }));
    if (p.size && p.size > VIDEO_MAX_MB * 1024 * 1024) return setError(t('ch.tooBig', { mb: VIDEO_MAX_MB }));
    setPicked(p);
  };

  const upload = async () => {
    if (!picked || !session) return;
    setProgress(0);
    setError(null);
    try {
      const thumb = await makeThumbnail(picked.uri);
      await api.uploadVideo(session.userId, {
        uri: picked.uri,
        mimeType: picked.mimeType,
        caption,
        thumbnailUri: thumb,
        onProgress: setProgress,
      });
      router.back();
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      setError(
        msg.includes('ONE_PER_MONTH') || msg.includes('duplicate') || msg.includes('23505')
          ? t('ch.onePerMonth')
          : msg || t('common.error'),
      );
      setProgress(null);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header left={<IconButton name="close" onPress={() => router.back()} label={t('common.close')} />} title={t('ch.upload')} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        {theme && (
          <Card>
            <T v="label" muted>
              {t('ch.theme')} · {formatMonth(month, locale)}
            </T>
            <T v="h2">{theme.title[settings.lang]}</T>
            {theme.description && <T muted>{theme.description[settings.lang]}</T>}
          </Card>
        )}
        <Banner text={`${t('ch.onePerMonth')} ${t('ch.maxLength', { s: VIDEO_MAX_SECONDS, mb: VIDEO_MAX_MB })}`} />

        {already ? (
          <Banner icon="checkmark-circle-outline" text={t('ch.uploaded')} />
        ) : (
          <>
            {picked ? (
              <Preview uri={picked.uri} />
            ) : (
              <Row>
                <Button
                  kind="secondary"
                  icon="images-outline"
                  title={t('ch.pick')}
                  onPress={() => choose(false)}
                  style={{ flex: 1 }}
                />
                {Platform.OS !== 'web' && (
                  <Button
                    kind="secondary"
                    icon="videocam-outline"
                    title={t('ch.record')}
                    onPress={() => choose(true)}
                    style={{ flex: 1 }}
                  />
                )}
              </Row>
            )}
            {picked && progress === null && (
              <Button kind="ghost" icon="swap-horizontal" title={t('ch.pick')} onPress={() => choose(false)} />
            )}
            <Field
              label={t('ch.caption')}
              placeholder={t('ch.captionPh')}
              value={caption}
              onChangeText={(s) => setCaption(s.slice(0, 300))}
              multiline
              maxLength={300}
            />
            {error && <Banner icon="alert-circle-outline" text={error} />}
            {progress !== null && (
              <View style={{ gap: 6 }}>
                <T v="small" muted>
                  {t('ch.uploading')} {Math.round(progress * 100)} %
                </T>
                <ProgressBar value={progress} />
              </View>
            )}
            <Button
              icon="cloud-upload-outline"
              title={t('ch.upload')}
              disabled={!picked}
              loading={progress !== null}
              onPress={upload}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Preview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <View style={{ height: 380, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const { colors } = useSettings();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.primarySoft, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(value * 100)}%`, height: 8, backgroundColor: colors.primary }} />
    </View>
  );
}
