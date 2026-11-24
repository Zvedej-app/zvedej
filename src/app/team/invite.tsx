import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Share, View } from 'react-native';
import { QrCode } from '../../components/coach/QrCode';
import { Avatar, Banner, Button, Card, Header, IconButton, Row, Screen, SearchBar, T } from '../../components/ui';
import { api } from '../../lib/api';
import { joinLink } from '../../lib/coach';
import { notify, toast } from '../../lib/dialog';
import type { Profile } from '../../lib/types';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings } from '../../providers/SettingsProvider';

/** Pozvání svěřenců: odkaz, QR kód do posilovny a vyhledání podle jména. */
export default function InviteScreen() {
  const { t } = useSettings();
  const { session } = useAuth();
  const me = session?.userId ?? '';
  const link = joinLink(me);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [linked, setLinked] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .coachTeam()
      .then((team) => setLinked(new Set(team.map((m) => m.profile.id))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) return;
    let alive = true;
    const timer = setTimeout(() => {
      api
        .searchProfiles(q.trim())
        .then((r) => alive && setResults(r.filter((p) => p.id !== me)))
        .catch(() => {});
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, me]);

  const share = async () => {
    const message = t('coach.shareText', { link });
    try {
      if (Platform.OS === 'web' && !(navigator as Navigator & { share?: unknown }).share) {
        await Clipboard.setStringAsync(link);
        toast(t('coach.linkCopied'));
      } else await Share.share({ message, url: link });
    } catch {}
  };

  return (
    <Screen>
      <Header
        left={<IconButton name="chevron-back" onPress={() => router.back()} label={t('common.back')} />}
        title={t('coach.invite')}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Card style={{ alignItems: 'center', gap: 12 }}>
          <T v="h3" style={{ textAlign: 'center' }}>
            {t('coach.qrTitle')}
          </T>
          <T v="small" muted style={{ textAlign: 'center' }}>
            {t('coach.qrHint')}
          </T>
          <View style={{ padding: 10, backgroundColor: '#FFF', borderRadius: 16 }}>
            <QrCode value={link} size={210} />
          </View>
          <Row style={{ alignSelf: 'stretch' }}>
            <Button icon="share-outline" title={t('coach.shareLink')} onPress={share} style={{ flex: 1 }} />
            <Button
              kind="secondary"
              icon="copy-outline"
              title={t('coach.copy')}
              onPress={async () => {
                await Clipboard.setStringAsync(link);
                toast(t('coach.linkCopied'));
              }}
            />
          </Row>
        </Card>

        <View style={{ gap: 10 }}>
          <T v="h3">{t('coach.findAthlete')}</T>
          <SearchBar value={q} onChangeText={setQ} placeholder={t('coach.searchPh')} />
          {q.trim().length >= 2 &&
            results.map((p) => {
              const name = `${p.firstName} ${p.lastName}`.trim();
              const done = linked.has(p.id);
              return (
                <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar uri={p.avatarUrl} name={name} size={38} />
                  <T style={{ flex: 1, fontWeight: '700' }} numberOfLines={1}>
                    {name}
                  </T>
                  <Button
                    small
                    kind={done ? 'secondary' : 'primary'}
                    icon={done ? 'checkmark' : 'person-add-outline'}
                    title={done ? t('coach.invited') : t('coach.inviteOne')}
                    disabled={done}
                    onPress={async () => {
                      try {
                        await api.inviteAthlete(p.id);
                        setLinked((s) => new Set([...s, p.id]));
                        toast(t('coach.inviteSent'));
                      } catch {
                        notify(t('common.error'));
                      }
                    }}
                  />
                </Card>
              );
            })}
        </View>
        <Banner icon="shield-checkmark-outline" text={t('coach.consentInfo')} />
      </ScrollView>
    </Screen>
  );
}
