import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Platform, Pressable, StyleSheet, View, type ListViewToken } from 'react-native';
import { clubName } from '../../lib/clubs';
import { currentMonthKey } from '../../lib/date';
import type { ChallengeVideo } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';
import { Avatar, T } from '../ui';

export interface ReelsPagerProps {
  videos: ChallengeVideo[];
  myUserId: string | null;
  initialIndex?: number;
  showRank?: boolean;
  onLike: (v: ChallengeVideo, liked: boolean) => void;
  onMore?: (v: ChallengeVideo) => void;
  /** odsazení obsahu shora (překryvná hlavička) */
  topInset?: number;
  bottomInset?: number;
  focused?: boolean;
}

export function ReelsPager({
  videos,
  myUserId,
  initialIndex = 0,
  showRank,
  onLike,
  onMore,
  topInset = 0,
  bottomInset = 0,
  focused = true,
}: ReelsPagerProps) {
  const [h, setH] = useState(0);
  const [active, setActive] = useState(initialIndex);
  const listRef = useRef<FlatList<ChallengeVideo>>(null);

  // FlatList vyžaduje stabilní referenci callbacku
  const onViewable = useCallback(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first?.index !== undefined && first.index !== null) setActive(first.index);
  }, []);

  // seřazení podle lajků kvůli zobrazení pořadí
  const rankOf = useCallback(
    (v: ChallengeVideo) =>
      [...videos]
        .sort((a, b) => b.likesCount - a.likesCount || a.createdAt.localeCompare(b.createdAt))
        .findIndex((x) => x.id === v.id) + 1,
    [videos],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {h > 0 && (
        <FlatList
          ref={listRef}
          data={videos}
          keyExtractor={(v) => v.id}
          pagingEnabled
          snapToInterval={h}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, Math.max(0, videos.length - 1))}
          getItemLayout={(_, i) => ({ length: h, offset: h * i, index: i })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ item, index }) => (
            <ReelItem
              video={item}
              height={h}
              active={focused && index === active}
              near={Math.abs(index - active) <= 1}
              mine={item.userId === myUserId}
              rank={showRank ? rankOf(item) : null}
              onLike={onLike}
              onMore={onMore}
              topInset={topInset}
              bottomInset={bottomInset}
            />
          )}
        />
      )}
    </View>
  );
}

function ReelItem({
  video,
  height,
  active,
  near,
  mine,
  rank,
  onLike,
  onMore,
  topInset,
  bottomInset,
}: {
  video: ChallengeVideo;
  height: number;
  active: boolean;
  near: boolean;
  mine: boolean;
  rank: number | null;
  onLike: (v: ChallengeVideo, liked: boolean) => void;
  onMore?: (v: ChallengeVideo) => void;
  topInset: number;
  bottomInset: number;
}) {
  const { t, colors, tap } = useSettings();
  const [heart] = useState(() => new Animated.Value(0));
  const lastTap = useRef(0);
  const [paused, setPaused] = useState(false);
  const [wasActive, setWasActive] = useState(active);
  const canLike = !mine && video.month === currentMonthKey();

  // po odscrollování se pauza zruší, aby se video příště přehrálo
  if (wasActive !== active) {
    setWasActive(active);
    if (!active) setPaused(false);
  }

  const like = (value: boolean) => {
    if (!canLike) return;
    tap(value ? 'medium' : 'light');
    onLike(video, value);
  };

  const onPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      if (canLike) {
        if (!video.likedByMe) like(true);
        heart.setValue(0);
        Animated.sequence([
          Animated.spring(heart, { toValue: 1, useNativeDriver: true, friction: 4 }),
          Animated.timing(heart, { toValue: 0, duration: 250, delay: 350, useNativeDriver: true }),
        ]).start();
      }
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) setPaused((p) => !p);
      }, 290);
    }
  };

  const name = `${video.author.firstName} ${video.author.lastName}`.trim();
  const club = clubName(video.author.clubId);

  return (
    <View style={{ height, backgroundColor: '#000' }}>
      {video.thumbnailUrl && !active && (
        <Image source={{ uri: video.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
      {near && <ReelVideo uri={video.videoUrl} playing={active && !paused} />}
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} accessibilityLabel={t('ch.reels')} />

      {paused && (
        <View pointerEvents="none" style={styles.center}>
          <Ionicons name="play" size={72} color="rgba(255,255,255,0.85)" />
        </View>
      )}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.center,
          { opacity: heart, transform: [{ scale: heart.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.1] }) }] },
        ]}
      >
        <Ionicons name="heart" size={120} color="#FFFFFF" />
      </Animated.View>

      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={[styles.bottomShade, { height: 260 + bottomInset }]}
      />

      {rank !== null && rank <= 3 && (
        <View style={[styles.rank, { top: topInset + 8, backgroundColor: rank === 1 ? '#F2C230' : 'rgba(255,255,255,0.9)' }]}>
          <Ionicons name="trophy" size={14} color={colors.primaryStrong} />
          <T v="small" color="#0A1633" style={{ fontWeight: '800' }}>
            #{rank}
          </T>
        </View>
      )}

      {/* pravý sloupec */}
      <View style={[styles.side, { bottom: bottomInset + 24 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="like"
          disabled={!canLike}
          onPress={() => like(!video.likedByMe)}
          style={{ alignItems: 'center', opacity: canLike ? 1 : 0.7 }}
        >
          <Ionicons name={video.likedByMe ? 'heart' : 'heart-outline'} size={36} color={video.likedByMe ? colors.like : '#FFF'} />
          <T v="small" color="#FFF" style={{ fontWeight: '800' }}>
            {video.likesCount}
          </T>
        </Pressable>
        {onMore && (
          <Pressable accessibilityRole="button" onPress={() => onMore(video)} style={{ alignItems: 'center' }} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={28} color="#FFF" />
          </Pressable>
        )}
      </View>

      {/* autor a popisek */}
      <View style={[styles.meta, { bottom: bottomInset + 20 }]}>
        <Pressable
          onPress={() => router.push(`/user/${video.author.id}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Avatar uri={video.author.avatarUrl} name={name} size={38} />
          <View style={{ flexShrink: 1 }}>
            <T v="h3" color="#FFF" numberOfLines={1}>
              {name}
            </T>
            {club && (
              <T v="caption" color="rgba(255,255,255,0.85)" numberOfLines={1}>
                {club}
              </T>
            )}
          </View>
        </Pressable>
        {video.caption && (
          <T color="#FFF" numberOfLines={3}>
            {video.caption}
          </T>
        )}
      </View>
    </View>
  );
}

function ReelVideo({ uri, playing }: { uri: string; playing: boolean }) {
  const { settings } = useSettings();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = settings.muted;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (playing && settings.autoplay !== false) player.play();
    else player.pause();
  }, [playing, player, settings.autoplay]);

  return (
    <>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
      {status === 'loading' && (
        <View pointerEvents="none" style={styles.center}>
          <ActivityIndicator color="#FFF" />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  side: { position: 'absolute', right: 12, alignItems: 'center', gap: 22 },
  meta: { position: 'absolute', left: 14, right: 80, gap: 8 },
  rank: {
    position: 'absolute',
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
