import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReelsPager } from '../../components/reels/ReelsPager';
import { Avatar, Button, Chip, ListItem, Row, Sheet, T } from '../../components/ui';
import { api, type VideoSort } from '../../lib/api';
import { clubName } from '../../lib/clubs';
import { currentMonthKey, formatMonth, timeLeftInMonth } from '../../lib/date';
import { confirm, notify } from '../../lib/dialog';
import { BLUE } from '../../lib/theme';
import type { ChallengeTheme, ChallengeVideo, MonthlyWinner } from '../../lib/types';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';

type View_ = 'reels' | 'ranking' | 'winners';

export default function ChallengeScreen() {
  const { t, settings, locale } = useSettings();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const month = currentMonthKey();
  const [view, setView] = useState<View_>('reels');
  const [sort, setSort] = useState<VideoSort>('random');
  const [theme, setTheme] = useState<ChallengeTheme | null>(null);
  const [videos, setVideos] = useState<ChallengeVideo[] | null>(null);
  const [winners, setWinners] = useState<MonthlyWinner[]>([]);
  const [focused, setFocused] = useState(true);
  const [more, setMore] = useState<ChallengeVideo | null>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [pagerKey, setPagerKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [rules, setRules] = useState(false);

  const load = useCallback(async () => {
    try {
      const [th, vs, ws] = await Promise.all([api.getTheme(month), api.listVideos(month, sort), api.listWinners()]);
      setTheme(th);
      setVideos(vs);
      setWinners(ws);
    } catch {
      setVideos((v) => v ?? []);
    } finally {
      setRefreshing(false);
    }
  }, [month, sort]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      load();
      return () => setFocused(false);
    }, [load]),
  );

  const myVideo = videos?.find((v) => v.userId === session?.userId) ?? null;
  const ranking = useMemo(
    () => [...(videos ?? [])].sort((a, b) => b.likesCount - a.likesCount || a.createdAt.localeCompare(b.createdAt)),
    [videos],
  );
  const left = timeLeftInMonth();

  const onLike = async (v: ChallengeVideo, liked: boolean) => {
    setVideos((list) =>
      (list ?? []).map((x) => (x.id === v.id ? { ...x, likedByMe: liked, likesCount: x.likesCount + (liked ? 1 : -1) } : x)),
    );
    try {
      await api.setLike(v.id, liked);
    } catch {
      setVideos((list) => (list ?? []).map((x) => (x.id === v.id ? v : x)));
    }
  };

  const headerH = insets.top + 108;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {view === 'reels' &&
        (videos && videos.length > 0 ? (
          <ReelsPager
            key={`${pagerKey}-${sort}`}
            videos={videos}
            myUserId={session?.userId ?? null}
            initialIndex={startIndex}
            showRank
            onLike={onLike}
            onMore={setMore}
            topInset={headerH}
            focused={focused}
          />
        ) : (
          <View style={[styles.empty, { paddingTop: headerH }]}>
            <Ionicons name="videocam-outline" size={56} color={BLUE[300]} />
            <T color="#FFF" style={{ textAlign: 'center' }}>
              {videos ? t('ch.noVideos') : t('common.loading')}
            </T>
            {videos && !myVideo && <Button icon="add" title={t('ch.upload')} onPress={() => router.push('/upload')} />}
          </View>
        ))}

      {view === 'ranking' && (
        <FlatList
          data={ranking}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingTop: headerH + 8, paddingHorizontal: 12, paddingBottom: 24, gap: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => (setRefreshing(true), load())} tintColor="#FFF" />
          }
          ListEmptyComponent={
            <T color="#FFF" style={{ textAlign: 'center', padding: 24 }}>
              {t('ch.noVideos')}
            </T>
          }
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => {
                setSort('top');
                setStartIndex(index);
                setPagerKey((k) => k + 1);
                setView('reels');
              }}
              style={[styles.rankRow, index === 0 && { borderColor: '#F2C230' }]}
            >
              <T v="h3" color={index === 0 ? '#F2C230' : '#FFF'} style={{ width: 34, textAlign: 'center' }}>
                {index + 1}
              </T>
              <Avatar uri={item.author.avatarUrl} name={`${item.author.firstName} ${item.author.lastName}`} size={42} />
              <View style={{ flex: 1 }}>
                <T color="#FFF" style={{ fontWeight: '700' }} numberOfLines={1}>
                  {item.author.firstName} {item.author.lastName}
                </T>
                <T v="caption" color="rgba(255,255,255,0.7)" numberOfLines={1}>
                  {clubName(item.author.clubId) ?? item.caption ?? ''}
                </T>
              </View>
              <Row gap={4}>
                <Ionicons name="heart" size={16} color="#FF4D6A" />
                <T color="#FFF" style={{ fontWeight: '800' }}>
                  {item.likesCount}
                </T>
              </Row>
            </Pressable>
          )}
        />
      )}

      {view === 'winners' && (
        <FlatList
          data={winners}
          keyExtractor={(w) => w.month}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ paddingTop: headerH + 8, paddingHorizontal: 12, paddingBottom: 24, gap: 10 }}
          ListEmptyComponent={
            <T color="#FFF" style={{ textAlign: 'center', padding: 24 }}>
              {t('ch.noWinners')}
            </T>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.winner, { width: (width - 34) / 2 }]}
              onPress={() => router.push(`/user/${item.author.id}`)}
            >
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: BLUE[800] }]} />
              )}
              <View style={styles.winnerShade} />
              <Ionicons name="trophy" size={30} color="#F2C230" />
              <Avatar uri={item.author.avatarUrl} name={`${item.author.firstName} ${item.author.lastName}`} size={56} ring />
              <T color="#FFF" style={{ fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>
                {item.author.firstName} {item.author.lastName}
              </T>
              <T v="caption" color="rgba(255,255,255,0.85)">
                {formatMonth(item.month, locale)}
              </T>
              <Row gap={4}>
                <Ionicons name="heart" size={13} color="#FF4D6A" />
                <T v="caption" color="#FFF">
                  {item.likes}
                </T>
              </Row>
            </Pressable>
          )}
        />
      )}

      {/* překryvná hlavička */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: 14 }}>
          <Pressable onPress={() => setRules(true)}>
            <T v="h3" color="#FFF">
              {t('ch.title')}
            </T>
            <T v="caption" color="rgba(255,255,255,0.75)">
              {formatMonth(month, locale)} · {left.days > 0 ? t('ch.endsIn', { d: left.days, h: left.hours }) : t('ch.endsToday')}
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ch.upload')}
            onPress={() => (myVideo ? notify(`${t('ch.uploaded')}. ${t('ch.onePerMonth')}`) : router.push('/upload'))}
            style={styles.uploadBtn}
          >
            <Ionicons name={myVideo ? 'checkmark-circle' : 'add-circle-outline'} size={30} color="#FFF" />
          </Pressable>
        </Row>
        {theme && (
          <Pressable onPress={() => setRules(true)} style={styles.themePill}>
            <Ionicons name="flame" size={14} color="#F2C230" />
            <T v="small" color="#FFF" numberOfLines={1} style={{ flexShrink: 1 }}>
              <T v="small" color="rgba(255,255,255,0.75)">
                {t('ch.theme')}:{' '}
              </T>
              <T v="small" color="#FFF" style={{ fontWeight: '800' }}>
                {theme.title[settings.lang]}
              </T>
            </T>
          </Pressable>
        )}
        <Row style={{ paddingHorizontal: 14, gap: 18 }}>
          {(['reels', 'ranking', 'winners'] as View_[]).map((k) => (
            <Pressable key={k} onPress={() => setView(k)}>
              <T
                v="small"
                color={view === k ? '#FFF' : 'rgba(255,255,255,0.6)'}
                style={{
                  fontWeight: '800',
                  borderBottomWidth: 2,
                  borderBottomColor: view === k ? '#FFF' : 'transparent',
                  paddingBottom: 4,
                }}
              >
                {t(k === 'reels' ? 'ch.reels' : k === 'ranking' ? 'ch.ranking' : 'ch.winners')}
              </T>
            </Pressable>
          ))}
          {view === 'reels' && (
            <Pressable
              accessibilityRole="button"
              style={styles.sortBtn}
              onPress={() => {
                const order: VideoSort[] = ['random', 'top', 'new'];
                setSort(order[(order.indexOf(sort) + 1) % order.length]);
                setStartIndex(0);
              }}
            >
              <Ionicons
                name={sort === 'random' ? 'shuffle' : sort === 'top' ? 'trophy-outline' : 'time-outline'}
                size={13}
                color="#FFF"
              />
              <T v="caption" color="#FFF" style={{ fontWeight: '700' }}>
                {t(`ch.sort.${sort}`)}
              </T>
            </Pressable>
          )}
        </Row>
      </View>

      <Sheet visible={!!more} onClose={() => setMore(null)}>
        <View style={{ paddingHorizontal: 8 }}>
          {more?.userId === session?.userId ? (
            <ListItem
              icon="trash-outline"
              danger
              title={t('ch.deleteVideo')}
              onPress={async () => {
                const v = more!;
                setMore(null);
                if (
                  !(await confirm(t('common.confirmDelete'), {
                    ok: t('common.delete'),
                    cancel: t('common.cancel'),
                    destructive: true,
                  }))
                )
                  return;
                try {
                  await api.deleteVideo(v);
                  load();
                } catch (e: any) {
                  notify(e?.message ?? t('common.error'));
                }
              }}
            />
          ) : (
            <ListItem
              icon="flag-outline"
              title={t('ch.report')}
              onPress={async () => {
                const v = more!;
                setMore(null);
                await api.reportVideo(v.id, 'inappropriate').catch(() => {});
                notify(t('ch.reported'));
              }}
            />
          )}
          {more && (
            <ListItem
              icon="person-outline"
              title={`${more.author.firstName} ${more.author.lastName}`}
              onPress={() => {
                const id = more.author.id;
                setMore(null);
                router.push(`/user/${id}`);
              }}
            />
          )}
        </View>
      </Sheet>

      <Sheet visible={rules} onClose={() => setRules(false)} title={t('ch.rules')}>
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {theme && (
            <View style={{ gap: 4 }}>
              <T v="label" muted>
                {t('ch.theme')} – {formatMonth(month, locale)}
              </T>
              <T v="h2">{theme.title[settings.lang]}</T>
              {theme.description && <T muted>{theme.description[settings.lang]}</T>}
            </View>
          )}
          <T>{t('ch.rulesText')}</T>
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip
              icon="time-outline"
              label={left.days > 0 ? t('ch.endsIn', { d: left.days, h: left.hours }) : t('ch.endsToday')}
            />
          </Row>
          {!myVideo && (
            <Button
              icon="add"
              title={t('ch.upload')}
              onPress={() => {
                setRules(false);
                router.push('/upload');
              }}
            />
          )}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0, gap: 8, paddingBottom: 6, backgroundColor: 'rgba(0,0,0,0.35)' },
  uploadBtn: { padding: 4 },
  sortBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  themePill: {
    marginHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(33,96,240,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: '92%',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  winner: {
    aspectRatio: 0.72,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
  },
  winnerShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,15,46,0.55)' },
});
