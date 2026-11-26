import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { exerciseName } from '../data/exercises';
import { fetchFeedCached } from '../lib/api/feeds';
import { clubName } from '../lib/clubs';
import type { TKey } from '../lib/i18n';
import { onNotificationOpen, pushSupported, registerDevice, syncReminders, type Reminder } from '../lib/push';
import { competitionReminders, trainingReminders } from '../lib/reminders';
import { todayISO } from '../lib/date';
import type { FeedItem } from '../lib/types';
import { useAuth } from '../providers/AuthProvider';
import { useSettings } from '../providers/SettingsProvider';
import { useTraining } from '../providers/TrainingProvider';

/**
 * Oznámení na pozadí (jen mobilní aplikace):
 *  - zaregistruje zařízení pro vzdálená oznámení (plán a komentáře od trenéra, zprávy),
 *  - naplánuje připomínky tréninku a závodů klubu (přepočítají se při každé změně tréninků),
 *  - po klepnutí na oznámení otevře příslušnou obrazovku.
 */
export function PushBridge() {
  const { settings, t } = useSettings();
  const { session, profile } = useAuth();
  const { data } = useTraining();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [day, setDay] = useState(todayISO());
  const names = useMemo(() => ({ social: t('push.channelSocial'), reminders: t('push.channelReminders') }), [t]);
  const signedIn = !!session && !session.isAnonymous;

  // klepnutí na oznámení
  useEffect(() => {
    if (!pushSupported) return;
    return onNotificationOpen((url) => {
      // chvilka pro dokončení startu aplikace a navigátoru
      setTimeout(() => router.push(url as never), 300);
    });
  }, []);

  // po návratu do aplikace jiný den → přepočítat připomínky
  useEffect(() => {
    if (!pushSupported) return;
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setDay(todayISO()));
    return () => sub.remove();
  }, []);

  // registrace zařízení (vzdálená oznámení)
  useEffect(() => {
    if (!pushSupported || !signedIn) return;
    registerDevice(settings.lang, { coach: settings.notifyCoach, messages: settings.notifyMessages }, names);
  }, [signedIn, session?.userId, settings.lang, settings.notifyCoach, settings.notifyMessages, names]);

  // kalendář závodů pro připomínky klubu
  const club = profile?.clubId ? clubName(profile.clubId) : null;
  useEffect(() => {
    if (!pushSupported || !settings.notifyComp || !club) return;
    let alive = true;
    fetchFeedCached('calendar')
      .then((r) => alive && setFeed(r.items))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [settings.notifyComp, club, day]);

  // místní připomínky
  const reminders = useMemo<Reminder[]>(() => {
    if (!pushSupported || !session) return [];
    const list: Reminder[] = [];
    if (settings.notifyTraining) {
      list.push(
        ...trainingReminders(data, {
          time: settings.notifyTime,
          weekdayName: (w) => t(`tr.weekdayFull.${w}` as TKey),
          exerciseName: (id, custom) => exerciseName(id, settings.lang, data.customExercises, custom),
          texts: { planned: t('push.planned'), habit: t('push.habit'), habitBody: t('push.habitBody') },
        }),
      );
    }
    if (settings.notifyComp && club) list.push(...competitionReminders(feed, club, { title: t('push.comp') }));
    return list;
    // `day` přepočítá připomínky po půlnoci
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, settings.notifyTraining, settings.notifyTime, settings.notifyComp, settings.lang, data, feed, club, t, day]);

  const key = reminders.map((r) => `${r.id}@${r.at.getTime()}:${r.title}:${r.body}`).join('|');
  useEffect(() => {
    if (!pushSupported) return;
    const id = setTimeout(() => syncReminders(reminders, names), 1500);
    return () => clearTimeout(id);
    // stačí přeplánovat při změně obsahu připomínek
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, names]);

  return null;
}
