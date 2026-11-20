import { router } from 'expo-router';
import React from 'react';
import { ProfileView } from '../../components/profile/ProfileView';
import { Header, IconButton, Loading, Screen } from '../../components/ui';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';

export default function ProfileTab() {
  const { t } = useSettings();
  const { profile, refreshProfile } = useAuth();
  return (
    <Screen>
      <Header
        title={profile ? `${profile.firstName} ${profile.lastName}`.trim() || t('tab.profile') : t('tab.profile')}
        right={<IconButton name="create-outline" label={t('pr.edit')} onPress={() => router.push('/profile-edit')} />}
      />
      {profile ? <ProfileView profile={profile} own onRefresh={refreshProfile} /> : <Loading />}
    </Screen>
  );
}
