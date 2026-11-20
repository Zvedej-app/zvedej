import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReelsPager } from '../components/reels/ReelsPager';
import { IconButton, Loading } from '../components/ui';
import { api } from '../lib/api';
import type { ChallengeVideo } from '../lib/types';
import { useAuth } from '../providers/AuthProvider';

/** Videa jednoho uživatele ve formátu reels (otevřené z profilu). */
export default function VideosScreen() {
  const { user, index } = useLocalSearchParams<{ user: string; index?: string }>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState<ChallengeVideo[] | null>(null);

  useEffect(() => {
    api
      .listUserVideos(user)
      .then(setVideos)
      .catch(() => setVideos([]));
  }, [user]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {videos === null ? (
        <Loading />
      ) : (
        <ReelsPager
          videos={videos}
          myUserId={session?.userId ?? null}
          initialIndex={Number(index ?? 0)}
          bottomInset={insets.bottom}
          onLike={async (v, liked) => {
            setVideos((l) =>
              (l ?? []).map((x) => (x.id === v.id ? { ...x, likedByMe: liked, likesCount: x.likesCount + (liked ? 1 : -1) } : x)),
            );
            await api.setLike(v.id, liked).catch(() => setVideos((l) => (l ?? []).map((x) => (x.id === v.id ? v : x))));
          }}
        />
      )}
      <IconButton
        name="chevron-back"
        color="#FFF"
        size={30}
        onPress={() => router.back()}
        style={{ position: 'absolute', top: insets.top + 8, left: 10 }}
      />
    </View>
  );
}
