import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { api, type UserStats } from '../../lib/api';
import { ageGroupLabel, formatCategory, sinclairTotal } from '../../lib/categories';
import { getClub } from '../../lib/clubs';
import { formatMonth } from '../../lib/date';
import { BLUE } from '../../lib/theme';
import type { ChallengeVideo, Profile } from '../../lib/types';
import { formatNumber, formatWeight } from '../../lib/units';
import { useSettings } from '../../providers/SettingsProvider';
import { Avatar, Banner, Button, Card, Chip, Empty, Row, Stat, T } from '../ui';

export function ProfileView({ profile, own, onRefresh }: { profile: Profile; own: boolean; onRefresh?: () => Promise<void> }) {
  const { t, colors, settings, locale } = useSettings();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<UserStats>({ videos: 0, likes: 0, wins: 0 });
  const [videos, setVideos] = useState<ChallengeVideo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const club = getClub(profile.clubId);
  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const total = profile.prSnatch && profile.prCleanJerk ? profile.prSnatch + profile.prCleanJerk : null;
  const sinclair =
    total && profile.gender && profile.bodyweight ? sinclairTotal(profile.gender, profile.bodyweight, total) : null;
  const tile = Math.floor((width - 4) / 3);
  const incomplete = own && (!profile.clubId || !profile.weightCategory || !profile.prSnatch);

  const load = useCallback(async () => {
    const [s, v] = await Promise.all([
      api.userStats(profile.id).catch(() => null),
      api.listUserVideos(profile.id).catch(() => []),
    ]);
    if (s) setStats(s);
    setVideos(v);
  }, [profile.id]);

  useEffect(() => {
    let alive = true;
    Promise.all([api.userStats(profile.id).catch(() => null), api.listUserVideos(profile.id).catch(() => [])]).then(([s, v]) => {
      if (!alive) return;
      if (s) setStats(s);
      setVideos(v);
    });
    return () => {
      alive = false;
    };
  }, [profile.id]);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          onRefresh={async () => {
            setRefreshing(true);
            await Promise.all([load(), onRefresh?.()]);
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={{ padding: 16, gap: 12 }}>
        <Row gap={18}>
          <Avatar uri={profile.avatarUrl} name={name} size={86} ring />
          <Row style={{ flex: 1, justifyContent: 'space-around' }} gap={0}>
            <Stat value={stats.videos} label={t('pr.videos')} />
            <Stat value={stats.likes} label={t('pr.likes')} />
            <Stat value={stats.wins} label={t('pr.wins')} />
          </Row>
        </Row>
        <View style={{ gap: 2 }}>
          <T v="h3">{name || '—'}</T>
          {profile.motto ? <T style={{ fontStyle: 'italic' }}>„{profile.motto}“</T> : null}
        </View>
        <Row style={{ flexWrap: 'wrap' }} gap={6}>
          {club && <Chip icon="barbell-outline" label={club.name} onPress={() => router.push(`/club/${club.id}`)} />}
          {profile.ageGroup && (
            <Chip icon="people-outline" label={ageGroupLabel(profile.ageGroup, profile.gender, settings.lang)} />
          )}
          {profile.weightCategory && <Chip icon="scale-outline" label={formatCategory(profile.weightCategory)} />}
        </Row>
        {own && (
          <Row>
            <Button
              kind="secondary"
              small
              title={t('pr.edit')}
              icon="create-outline"
              style={{ flex: 1 }}
              onPress={() => router.push('/profile-edit')}
            />
          </Row>
        )}
        {incomplete && <Banner text={t('pr.completeProfile')} />}

        <Card>
          <T v="label" muted>
            {t('pr.prs')}
          </T>
          <Row style={{ justifyContent: 'space-between' }}>
            <PR label={t('pr.snatch')} value={formatWeight(profile.prSnatch, settings.unit)} />
            <PR label={t('pr.cj')} value={formatWeight(profile.prCleanJerk, settings.unit)} />
            <PR label={t('pr.total')} value={formatWeight(total, settings.unit)} strong />
          </Row>
          {sinclair && (
            <T v="small" muted style={{ textAlign: 'right' }}>
              {t('pr.sinclair')}: {formatNumber(sinclair, 2)} · {t('pr.bodyweight').toLowerCase()}{' '}
              {formatWeight(profile.bodyweight, settings.unit)}
            </T>
          )}
        </Card>
      </View>

      <Row style={[styles.gridHeader, { borderColor: colors.border }]}>
        <Ionicons name="grid-outline" size={18} color={colors.text} />
        <T v="label">{own ? t('pr.myVideos') : t('pr.videos')}</T>
      </Row>
      {videos.length === 0 ? (
        <Empty icon="videocam-outline" text={t('pr.noVideos')} />
      ) : (
        <View style={styles.grid}>
          {videos.map((v, i) => (
            <Pressable
              key={v.id}
              style={{ width: tile, height: tile * 1.5, backgroundColor: BLUE[900] }}
              onPress={() => router.push({ pathname: '/videos', params: { user: profile.id, index: String(i) } })}
            >
              {v.thumbnailUrl ? (
                <Image source={{ uri: v.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="play" size={28} color="rgba(255,255,255,0.6)" />
                </View>
              )}
              <View style={styles.tileMeta}>
                <Row gap={3}>
                  <Ionicons name="heart" size={12} color="#FFF" />
                  <T v="caption" color="#FFF" style={{ fontWeight: '700' }}>
                    {v.likesCount}
                  </T>
                </Row>
                <T v="caption" color="#FFF" numberOfLines={1}>
                  {formatMonth(v.month, locale)}
                </T>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function PR({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useSettings();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <T v="h2" color={strong ? colors.primary : undefined}>
        {value}
      </T>
      <T v="caption" muted>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  gridHeader: {
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  tileMeta: { position: 'absolute', left: 6, right: 6, bottom: 6, gap: 1 },
});
