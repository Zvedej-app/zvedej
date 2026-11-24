import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ConsentSheet } from '../components/coach/ConsentSheet';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Empty,
  Header,
  IconButton,
  ListGroup,
  ListItem,
  Loading,
  Row,
  Screen,
  T,
} from '../components/ui';
import { api } from '../lib/api';
import { confirm, toast } from '../lib/dialog';
import type { MyCoach, Profile } from '../lib/types';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

/** Svěřenec: moji trenéři, pozvánky a co trenér vidí. */
export default function CoachesScreen() {
  const { t } = useSettings();
  const { session } = useAuth();
  const training = useTraining();
  const [list, setList] = useState<MyCoach[] | null>(null);
  const [consent, setConsent] = useState<Profile | null>(null);
  const me = session?.userId ?? '';

  const load = useCallback(() => {
    api
      .myCoaches()
      .then(setList)
      .catch(() => setList([]));
  }, []);
  useFocusEffect(load);

  const pending = (list ?? []).filter((c) => c.status === 'pending');
  const accepted = (list ?? []).filter((c) => c.status === 'accepted');

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('coach.myCoaches')}
      />
      {list === null ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
          {pending.map((c) => {
            const name = `${c.profile.firstName} ${c.profile.lastName}`.trim();
            return (
              <Card key={c.profile.id} style={{ gap: 10 }}>
                <Row gap={12}>
                  <Avatar uri={c.profile.avatarUrl} name={name} size={44} />
                  <View style={{ flex: 1 }}>
                    <T v="h3">{name}</T>
                    <T v="small" muted>
                      {t('coach.invitesYou')}
                    </T>
                  </View>
                </Row>
                <Row>
                  <Button title={t('coach.showInvite')} style={{ flex: 1 }} onPress={() => setConsent(c.profile)} />
                  <Button
                    kind="secondary"
                    title={t('soc.decline')}
                    onPress={async () => {
                      await api.removeCoachLink(c.profile.id, me).catch(() => {});
                      load();
                    }}
                  />
                </Row>
              </Card>
            );
          })}

          {accepted.length === 0 && pending.length === 0 ? <Empty icon="people-outline" text={t('coach.noCoaches')} /> : null}

          {accepted.map((c) => {
            const name = `${c.profile.firstName} ${c.profile.lastName}`.trim();
            return (
              <View key={c.profile.id} style={{ gap: 8 }}>
                <ListGroup>
                  <ListItem
                    left={<Avatar uri={c.profile.avatarUrl} name={name} size={36} />}
                    title={name}
                    subtitle={t('coach.yourCoach')}
                    onPress={() => router.push(`/user/${c.profile.id}`)}
                  />
                  <ListItem
                    icon="scale-outline"
                    title={t('coach.shareBw')}
                    subtitle={t('coach.shareBwHint')}
                    toggle={c.shareBodyweight}
                    onToggle={async (v) => {
                      await api.setCoachShare(c.profile.id, v).catch(() => {});
                      load();
                    }}
                  />
                  <ListItem
                    icon="person-remove-outline"
                    danger
                    title={t('coach.leave')}
                    onPress={async () => {
                      if (
                        !(await confirm(t('coach.leaveQ', { name }), {
                          ok: t('coach.leave'),
                          cancel: t('common.cancel'),
                          destructive: true,
                        }))
                      )
                        return;
                      await api.removeCoachLink(c.profile.id, me).catch(() => {});
                      toast(t('coach.left'));
                      load();
                      training.syncCoachPlans();
                    }}
                  />
                </ListGroup>
              </View>
            );
          })}
          <Banner icon="shield-checkmark-outline" text={t('coach.privacyNote')} />
        </ScrollView>
      )}
      <ConsentSheet
        coach={consent}
        onClose={() => setConsent(null)}
        onDone={() => {
          setConsent(null);
          toast(t('coach.joined'));
          load();
          training.syncCoachPlans();
        }}
      />
    </Screen>
  );
}
