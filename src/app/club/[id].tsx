import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import {
  Avatar,
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
} from '../../components/ui';
import { ClubBadge } from '../../components/ClubBadge';
import { api } from '../../lib/api';
import { formatCategory } from '../../lib/categories';
import { getClub } from '../../lib/clubs';
import type { Profile } from '../../lib/types';
import { useSettings } from '../../providers/SettingsProvider';

export default function ClubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useSettings();
  const club = getClub(Number(id));
  const [members, setMembers] = useState<Profile[] | null>(null);

  useEffect(() => {
    if (!club) return;
    api
      .searchProfiles('', club.id)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [club]);

  if (!club) {
    return (
      <Screen>
        <Header left={<IconButton name="chevron-back" onPress={() => router.back()} />} />
        <Empty text={t('csv.noResults')} />
      </Screen>
    );
  }

  const openMap = () => {
    if (club.lat === null || club.lng === null) return;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${club.lat},${club.lng}&q=${encodeURIComponent(club.name)}`
        : `https://www.google.com/maps/search/?api=1&query=${club.lat},${club.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('pr.club')}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        <Card>
          <Row gap={12}>
            <ClubBadge club={club} size={48} />
            <T v="h2" style={{ flex: 1 }}>
              {club.name}
            </T>
          </Row>
          <T muted>
            {club.city} · {t(club.region === 'cechy' ? 'csv.region.cechy' : 'csv.region.morava')}
          </T>
          {club.address ? <T v="small">{club.address}</T> : null}
          <Row style={{ flexWrap: 'wrap' }}>
            {club.lat !== null && (
              <Button small kind="secondary" icon="navigate-outline" title={t('csv.navigate')} onPress={openMap} />
            )}
            {club.web && (
              <Button
                small
                kind="secondary"
                icon="globe-outline"
                title="Web"
                onPress={() => WebBrowser.openBrowserAsync(club.web!)}
              />
            )}
            {club.facebook && (
              <Button
                small
                kind="secondary"
                icon="logo-facebook"
                title="Facebook"
                onPress={() => Linking.openURL(club.facebook!)}
              />
            )}
            {club.instagram && (
              <Button
                small
                kind="secondary"
                icon="logo-instagram"
                title="Instagram"
                onPress={() => Linking.openURL(club.instagram!)}
              />
            )}
          </Row>
        </Card>

        {members === null ? (
          <Loading />
        ) : members.length === 0 ? (
          <Empty icon="people-outline" text={t('csv.noMembers')} />
        ) : (
          <ListGroup title={`${t('csv.members')} (${members.length})`}>
            {members.map((m) => (
              <ListItem
                key={m.id}
                title={`${m.firstName} ${m.lastName}`}
                subtitle={m.weightCategory ? formatCategory(m.weightCategory) : undefined}
                right={<Avatar uri={m.avatarUrl} name={`${m.firstName} ${m.lastName}`} size={36} />}
                onPress={() => router.push(`/user/${m.id}`)}
              />
            ))}
          </ListGroup>
        )}
      </ScrollView>
    </Screen>
  );
}
