import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ConsentSheet } from '../../components/coach/ConsentSheet';
import { Avatar, Button, Empty, Header, IconButton, Loading, Screen, T } from '../../components/ui';
import { api } from '../../lib/api';
import { toast } from '../../lib/dialog';
import type { Profile } from '../../lib/types';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';

/** Připojení k trenérovi odkazem nebo QR kódem. */
export default function JoinCoachScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useSettings();
  const { session } = useAuth();
  const training = useTraining();
  const [coach, setCoach] = useState<Profile | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api
      .getCoach(id)
      .then(setCoach)
      .catch(() => setCoach(null));
  }, [id]);

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const name = coach ? `${coach.firstName} ${coach.lastName}`.trim() : '';

  return (
    <Screen>
      <Header left={<IconButton name="chevron-back" onPress={leave} label={t('common.back')} />} title={t('coach.joinTitle')} />
      {coach === undefined ? (
        <Loading />
      ) : !coach || coach.id === session?.userId ? (
        <Empty icon="alert-circle-outline" text={t('coach.badLink')} />
      ) : (
        <View style={{ padding: 24, gap: 16, alignItems: 'center' }}>
          <Avatar uri={coach.avatarUrl} name={name} size={88} ring />
          <T v="h2" style={{ textAlign: 'center' }}>
            {name}
          </T>
          <T muted style={{ textAlign: 'center' }}>
            {t('coach.joinHint')}
          </T>
          <Button icon="people" title={t('coach.joinBtn')} onPress={() => setOpen(true)} style={{ alignSelf: 'stretch' }} />
        </View>
      )}
      <ConsentSheet
        coach={open ? (coach ?? null) : null}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          toast(t('coach.joined'));
          training.syncCoachPlans();
          router.replace('/coaches');
        }}
      />
    </Screen>
  );
}
