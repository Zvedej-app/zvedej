import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useBottomInset, useTopInset } from '../lib/insets';
import { useIsDesktop } from '../lib/layout';
import { ReelsPager } from '../components/reels/ReelsPager';
import { IconButton, Loading } from '../components/ui';
import { api } from '../lib/api';
import type { ChallengeVideo } from '../lib/types';
import { useAuth } from '../providers/AuthProvider';
import { useRequireAccount } from '../hooks/useRequireAccount';

/** Videa jednoho uživatele ve formátu reels (otevřené z profilu). */
export default function VideosScreen() {
  const needAccount = useRequireAccount();
  const { user, index } = useLocalSearchParams<{ user: string; index?: string }>();
  const { session } = useAuth();
  const bottomInset = useBottomInset();
  const topInset = useTopInset();
  const [videos, setVideos] = useState<ChallengeVideo[] | null>(null);
  const desktop = useIsDesktop();
  const { height } = useWindowDimensions();

  useEffect(() => {
    api
      .listUserVideos(user)
      .then(setVideos)
      .catch(() => setVideos([]));
  }, [user]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: desktop ? 'center' : undefined }}>
      {/* na počítači videa ve sloupci na výšku uprostřed */}
      <View style={desktop ? { flex: 1, width: Math.max(420, Math.round(height * 0.6)) } : { flex: 1 }}>
        {videos === null ? (
          <Loading />
        ) : (
          <ReelsPager
            videos={videos}
            myUserId={session?.userId ?? null}
            initialIndex={Number(index ?? 0)}
            bottomInset={bottomInset}
            onLike={async (v, liked) => {
              if (!(await needAccount())) return;
              setVideos((l) =>
                (l ?? []).map((x) =>
                  x.id === v.id ? { ...x, likedByMe: liked, likesCount: x.likesCount + (liked ? 1 : -1) } : x,
                ),
              );
              await api.setLike(v.id, liked).catch(() => setVideos((l) => (l ?? []).map((x) => (x.id === v.id ? v : x))));
            }}
          />
        )}
      </View>
      <IconButton
        name="chevron-back"
        color="#FFF"
        size={30}
        onPress={() => router.back()}
        style={{ position: 'absolute', top: topInset + 8, left: 10 }}
      />
    </View>
  );
}
