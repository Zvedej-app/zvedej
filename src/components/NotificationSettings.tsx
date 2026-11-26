import React, { useEffect, useState } from 'react';
import { AppState, Linking, View } from 'react-native';
import { hasNotificationPermission, pushSupported, requestNotificationPermission } from '../lib/push';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';
import { Banner, Button, ListGroup, ListItem, Row, Sheet } from './ui';
import { range, Wheel } from './WheelPicker';

const pad = (n: number) => String(n).padStart(2, '0');

/** Nastavení → Upozornění: připomínka tréninku, trenér, zprávy, závody klubu. */
export function NotificationSettings() {
  const { t, settings, update } = useSettings();
  const { session, profile } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [timeSheet, setTimeSheet] = useState(false);
  const [h, m] = settings.notifyTime.split(':').map(Number);
  const [hour, setHour] = useState(h);
  const [minute, setMinute] = useState(m);
  const names = { social: t('push.channelSocial'), reminders: t('push.channelReminders') };

  useEffect(() => {
    if (!pushSupported) return;
    const check = () => hasNotificationPermission().then(setAllowed);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  if (!pushSupported) {
    return (
      <ListGroup title={t('push.section')}>
        <View style={{ padding: 12 }}>
          <Banner text={t('push.webOnly')} />
        </View>
      </ListGroup>
    );
  }

  /** zapnutí přepínače se zeptá na povolení oznámení */
  const enable = async (patch: Parameters<typeof update>[0], on: boolean) => {
    update(patch);
    if (on && !allowed) {
      const ok = await requestNotificationPermission(names);
      setAllowed(ok);
    }
  };
  const guest = !session || session.isAnonymous;

  return (
    <ListGroup title={t('push.section')}>
      {allowed === false && (
        <ListItem
          icon="notifications-off-outline"
          title={t('push.allow')}
          subtitle={t('push.allowHint')}
          onPress={async () => {
            const ok = await requestNotificationPermission(names);
            setAllowed(ok);
            if (!ok) Linking.openSettings();
          }}
        />
      )}
      <ListItem
        icon="alarm-outline"
        title={t('push.training')}
        subtitle={t('push.trainingHint')}
        toggle={settings.notifyTraining}
        onToggle={(notifyTraining) => enable({ notifyTraining }, notifyTraining)}
      />
      {settings.notifyTraining && (
        <ListItem icon="time-outline" title={t('push.time')} value={settings.notifyTime} onPress={() => setTimeSheet(true)} />
      )}
      {!guest && (
        <ListItem
          icon="clipboard-outline"
          title={t('push.coach')}
          subtitle={t('push.coachHint')}
          toggle={settings.notifyCoach}
          onToggle={(notifyCoach) => enable({ notifyCoach }, notifyCoach)}
        />
      )}
      {!guest && (
        <ListItem
          icon="chatbubble-outline"
          title={t('push.messages')}
          toggle={settings.notifyMessages}
          onToggle={(notifyMessages) => enable({ notifyMessages }, notifyMessages)}
        />
      )}
      <ListItem
        icon="trophy-outline"
        title={t('push.compToggle')}
        subtitle={profile?.clubId ? t('push.compHint') : t('push.compNoClub')}
        toggle={settings.notifyComp}
        onToggle={(notifyComp) => enable({ notifyComp }, notifyComp)}
      />

      <Sheet visible={timeSheet} onClose={() => setTimeSheet(false)} title={t('push.time')}>
        <View style={{ alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
          <Row gap={8} style={{ justifyContent: 'center' }}>
            <Wheel values={range(5, 22)} value={hour} onChange={setHour} format={pad} width={90} />
            <Wheel values={range(0, 55, 5)} value={minute} onChange={setMinute} format={pad} width={90} />
          </Row>
          <Button
            title={t('common.done')}
            style={{ alignSelf: 'stretch' }}
            onPress={() => {
              update({ notifyTime: `${pad(hour)}:${pad(minute)}` });
              setTimeSheet(false);
            }}
          />
        </View>
      </Sheet>
    </ListGroup>
  );
}

