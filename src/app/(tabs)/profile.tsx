import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { ProfileView } from '../../components/profile/ProfileView';
import { Header, IconButton, Loading, Row, Screen, T } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';

export default function ProfileTab() {
  const { t, colors } = useSettings();
  const { profile, refreshProfile } = useAuth();
  const [unread, setUnread] = useState(0);
  useFocusEffect(
    useCallback(() => {
      api.unreadCount().then(setUnread).catch(() => {});
    }, []),
  );
  return (
    <Screen>
      <Header
        left={
          <Row gap={2}>
            <IconButton name="people-outline" label={t('soc.friends')} onPress={() => router.push('/friends')} />
            <View>
              <IconButton name="chatbubbles-outline" label={t('soc.messages')} onPress={() => router.push('/messages')} />
              {unread > 0 && (
                <View
                  pointerEvents="none"
                  style={{ position: 'absolute', top: -2, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}
                >
                  <T v="caption" color="#FFF" style={{ fontWeight: '800', fontSize: 11 }}>
                    {unread > 9 ? '9+' : unread}
                  </T>
                </View>
              )}
            </View>
          </Row>
        }
        title={profile ? `${profile.firstName} ${profile.lastName}`.trim() || t('tab.profile') : t('tab.profile')}
        right={<IconButton name="create-outline" label={t('pr.edit')} onPress={() => router.push('/profile-edit')} />}
      />
      {profile ? <ProfileView profile={profile} own onRefresh={refreshProfile} /> : <Loading />}
    </Screen>
  );
}
