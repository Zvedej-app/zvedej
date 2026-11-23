import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ProfileView } from '../../components/profile/ProfileView';
import { UserSafetyMenu } from '../../components/safety/UserSafetyMenu';
import { useSession } from '../../hooks/useSession';
import { Empty, Header, IconButton, Loading, Screen } from '../../components/ui';
import { api } from '../../lib/api';
import type { Profile } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';

export default function UserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useSettings();
  const me = useSession();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    api
      .getProfile(id)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [id]);

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={profile ? `${profile.firstName} ${profile.lastName}` : ''}
        right={
          profile && profile.id !== me ? (
            <UserSafetyMenu userId={profile.id} name={`${profile.firstName} ${profile.lastName}`.trim()} />
          ) : undefined
        }
      />
      {profile === undefined ? (
        <Loading />
      ) : profile ? (
        <ProfileView profile={profile} own={false} />
      ) : (
        <Empty text={t('csv.noResults')} />
      )}
    </Screen>
  );
}
