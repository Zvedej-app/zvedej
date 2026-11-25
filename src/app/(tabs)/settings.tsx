import Constants from 'expo-constants';
import { ScreenDiagnostics } from '../../components/ScreenDiagnostics';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { AppIcon } from '../../components/Logo';
import { Banner, Button, Header, ListGroup, ListItem, Row, Screen, Segmented, Sheet, T } from '../../components/ui';
import { range, Wheel } from '../../components/WheelPicker';
import { api } from '../../lib/api';
import { clearFeedCache } from '../../lib/api/feeds';
import { exportTrainingPdf } from '../../lib/exportPdf';
import { shareJson } from '../../lib/exportJson';
import { todayISO } from '../../lib/date';
import { playRestSound, type RestSound } from '../../lib/restSound';
import { CSV_BASE, FEEDBACK_EMAIL } from '../../lib/config';
import { confirm, notify } from '../../lib/dialog';
import { LANG_LABELS, type Lang } from '../../lib/i18n';
import { useAuth } from '../../providers/AuthProvider';
import { useSettings, type ThemeMode } from '../../providers/SettingsProvider';
import { useTraining } from '../../providers/TrainingProvider';
import { useRequireAccount } from '../../hooks/useRequireAccount';

const REST = [0, ...range(30, 600, 15)];
const mmss = (s: number) => (s === 0 ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

export default function SettingsScreen() {
  const { t, settings, update, colors } = useSettings();
  const { session, profile, saveProfile } = useAuth();
  const { data } = useTraining();
  const needAccount = useRequireAccount();
  const [restSheet, setRestSheet] = useState(false);
  const [rest, setRest] = useState(settings.restSec);

  const exportData = async () => {
    try {
      const owner = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
      await exportTrainingPdf(data, settings.lang, settings.unit, owner || 'Zvedej');
    } catch {
      notify(t('common.error'));
    }
  };

  const exportAll = async () => {
    try {
      const all = await api.exportMyData();
      await shareJson(all, `zvedej-data-${todayISO()}.json`);
    } catch {
      notify(t('common.error'));
    }
  };

  return (
    <Screen>
      <Header title={t('tab.settings')} />
      <View style={{ flex: 1 }}>
        <Screen scroll edges={[]}>
          {session?.isAnonymous && (
            <View style={{ backgroundColor: colors.primary, borderRadius: 18, padding: 16, gap: 10 }}>
              <T v="h3" color="#FFF">
                {t('guest.youAreGuest')}
              </T>
              <T v="small" color="rgba(255,255,255,0.85)">
                {t('guest.youAreGuestHint')}
              </T>
              <Button
                icon="person-add-outline"
                title={t('guest.createAccount')}
                onPress={() => router.push('/account')}
                style={{ backgroundColor: colors.accent }}
              />
            </View>
          )}
          {session?.needsPassword && (
            <ListGroup>
              <ListItem
                icon="lock-closed-outline"
                title={t('guest.setPassword')}
                subtitle={t('guest.setPasswordHint')}
                onPress={() => router.push('/set-password')}
              />
            </ListGroup>
          )}

          <ListGroup title={t('st.appearance')}>
            <View style={{ padding: 12, gap: 8 }}>
              <T v="small" muted>
                {t('st.theme')}
              </T>
              <Segmented<ThemeMode>
                value={settings.theme}
                onChange={(theme) => update({ theme })}
                options={[
                  { key: 'light', label: t('st.theme.light'), icon: 'sunny-outline' },
                  { key: 'dark', label: t('st.theme.dark'), icon: 'moon-outline' },
                ]}
              />
            </View>
            <View style={{ padding: 12, gap: 8 }}>
              <T v="small" muted>
                {t('st.language')}
              </T>
              <Segmented<Lang>
                value={settings.lang}
                onChange={(lang) => update({ lang })}
                options={(Object.keys(LANG_LABELS) as Lang[]).map((l) => ({ key: l, label: LANG_LABELS[l] }))}
              />
            </View>
            <View style={{ padding: 12, gap: 8 }}>
              <T v="small" muted>
                {t('st.units')}
              </T>
              <Segmented
                value={settings.unit}
                onChange={(unit) => update({ unit, barKg: 20 })}
                options={[
                  { key: 'kg', label: t('st.kg') },
                  { key: 'lb', label: t('st.lb') },
                ]}
              />
            </View>
          </ListGroup>

          <ListGroup title={t('st.training')}>
            {settings.unit === 'kg' && (
              <View style={{ padding: 12, gap: 8 }}>
                <T v="small" muted>
                  {t('st.barWeight')}
                </T>
                <Segmented
                  value={String(settings.barKg)}
                  onChange={(v) => update({ barKg: Number(v) })}
                  options={['20', '15', '10'].map((v) => ({ key: v, label: `${v} kg` }))}
                />
              </View>
            )}
            <ListItem
              icon="timer-outline"
              title={t('st.restTimer')}
              value={mmss(settings.restSec)}
              onPress={() => {
                setRest(settings.restSec);
                setRestSheet(true);
              }}
            />
            <View style={{ padding: 12, gap: 8 }}>
              <T v="small" muted>
                {t('st.sound')}
              </T>
              <Segmented<RestSound>
                value={settings.restSound}
                onChange={(restSound) => {
                  update({ restSound });
                  playRestSound(restSound);
                }}
                options={[
                  { key: 'gong', label: t('st.sound.gong') },
                  { key: 'whistle', label: t('st.sound.whistle') },
                  { key: 'bell', label: t('st.sound.bell') },
                  { key: 'none', label: t('st.sound.none') },
                ]}
              />
            </View>
            {Platform.OS !== 'web' && (
              <ListItem
                icon="notifications-outline"
                title={t('st.notifyRest')}
                subtitle={t('st.watchHint')}
                toggle={settings.restNotify}
                onToggle={(restNotify) => update({ restNotify })}
              />
            )}
            {Platform.OS !== 'web' && (
              <ListItem
                icon="pulse-outline"
                title={t('st.haptics')}
                toggle={settings.haptics}
                onToggle={(haptics) => update({ haptics })}
              />
            )}
          </ListGroup>

          <ListGroup title={t('st.challenge')}>
            <ListItem
              icon="play-outline"
              title={t('st.autoplay')}
              toggle={settings.autoplay}
              onToggle={(autoplay) => update({ autoplay })}
            />
            <ListItem
              icon="volume-mute-outline"
              title={t('st.muted')}
              toggle={settings.muted}
              onToggle={(muted) => update({ muted })}
            />
          </ListGroup>

          <ListGroup title={t('st.privacy')}>
            <ListItem
              icon="eye-outline"
              title={t('st.publicProfile')}
              toggle={profile?.isPublic ?? true}
              onToggle={(isPublic) => saveProfile({ isPublic }).catch(() => {})}
            />
            <ListItem
              icon="scale-outline"
              title={t('pr.showBodyweight')}
              subtitle={t('pr.showBodyweightHint')}
              toggle={profile?.showBodyweight ?? false}
              onToggle={(showBodyweight) => saveProfile({ showBodyweight }).catch(() => {})}
            />
            <ListItem icon="ban-outline" title={t('safety.blockedUsers')} onPress={() => router.push('/blocked')} />
          </ListGroup>

          <ListGroup title={t('coach.section')}>
            <ListItem icon="people-outline" title={t('coach.myCoaches')} onPress={() => router.push('/coaches')} />
            <ListItem
              icon="clipboard-outline"
              title={t('coach.iAmCoach')}
              subtitle={t('coach.iAmCoachHint')}
              toggle={profile?.isCoach ?? false}
              onToggle={async (isCoach) => (await needAccount()) && saveProfile({ isCoach }).catch(() => {})}
            />
          </ListGroup>

          {profile?.isAdmin && (
            <ListGroup title={t('mod.section')}>
              <ListItem icon="shield-checkmark-outline" title={t('mod.title')} onPress={() => router.push('/moderation')} />
            </ListGroup>
          )}

          <ListGroup title={t('st.data')}>
            <ListItem icon="document-text-outline" title={t('st.exportPdf')} onPress={exportData} />
            <ListItem icon="download-outline" title={t('st.exportAll')} subtitle={t('st.exportAllHint')} onPress={exportAll} />
            <ListItem
              icon="refresh-outline"
              title={t('st.clearCache')}
              onPress={async () => {
                await clearFeedCache();
                notify(t('st.cacheCleared'));
              }}
            />
          </ListGroup>

          <ListGroup title={t('st.account')}>
            {session?.email ? <ListItem icon="mail-outline" title={t('st.signedInAs')} value={session.email} /> : null}
            <ListItem
              icon="log-out-outline"
              title={t('st.logout')}
              onPress={async () => {
                const q = session?.isAnonymous ? t('guest.logoutWarning') : `${t('st.logout')}?`;
                if (await confirm(q, { ok: t('st.logout'), cancel: t('common.cancel'), destructive: !!session?.isAnonymous }))
                  api.signOut();
              }}
            />
            <ListItem
              icon="trash-outline"
              danger
              title={t('st.deleteAccount')}
              onPress={async () => {
                if (
                  !(await confirm(t('st.deleteAccountQ'), {
                    ok: t('common.delete'),
                    cancel: t('common.cancel'),
                    destructive: true,
                  }))
                )
                  return;
                try {
                  await api.deleteAccount();
                } catch (e: any) {
                  notify(e?.message ?? t('common.error'));
                }
              }}
            />
          </ListGroup>

          <ListGroup title={t('st.about')}>
            <ListItem icon="document-lock-outline" title={t('legal.privacy')} onPress={() => router.push('/legal/privacy')} />
            <ListItem icon="reader-outline" title={t('legal.terms')} onPress={() => router.push('/legal/terms')} />
            <ListItem icon="business-outline" title={t('legal.contact')} onPress={() => router.push('/legal/contact')} />
            <ListItem icon="globe-outline" title={t('st.csvWeb')} onPress={() => WebBrowser.openBrowserAsync(CSV_BASE)} />
            {FEEDBACK_EMAIL ? (
              <ListItem
                icon="chatbubble-ellipses-outline"
                title={t('st.feedback')}
                onPress={() => Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=Zvedej`)}
              />
            ) : null}
          </ListGroup>

          {api.mode === 'demo' && <Banner text={t('common.demo')} />}

          <View style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
            <AppIcon size={56} />
            <T v="h3">Zvedej</T>
            <T v="small" muted>
              {t('st.version')} {Constants.expoConfig?.version ?? '1.0.0'}
            </T>
            <T v="small" muted>
              {t('app.by')}
            </T>
            <T v="caption" muted style={{ textAlign: 'center', paddingHorizontal: 24 }}>
              {t('app.unofficial')}
            </T>
            <ScreenDiagnostics />
          </View>
        </Screen>
      </View>

      <Sheet visible={restSheet} onClose={() => setRestSheet(false)} title={t('st.restTimer')}>
        <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
          <Wheel values={REST} value={rest} onChange={setRest} format={mmss} width={140} />
          <Row style={{ alignSelf: 'stretch' }}>
            <Button
              title={t('common.done')}
              style={{ flex: 1 }}
              onPress={() => {
                update({ restSec: rest });
                setRestSheet(false);
              }}
            />
          </Row>
        </View>
      </Sheet>
    </Screen>
  );
}
