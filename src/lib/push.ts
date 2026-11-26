import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

/**
 * Oznámení mimo časovač pauzy:
 *  - vzdálená (push): nový plán od trenéra, komentář k tréninku, zpráva – posílá je databáze přes Expo Push,
 *  - místní: připomínka tréninku v plánovaný den a připomínka závodu klubu.
 * Na webu se nepoužívají (soubor push.web.ts).
 */
export const pushSupported = true;

const REST_CATEGORY = 'REST';
const PREFIX = 'zv-rem-';
let handlerInstalled = false;
let channelsReady = false;
let lastToken: string | null = null;

/** Jak zobrazit oznámení, když je aplikace otevřená: pauzu ukazuje obrazovka tréninku, ostatní jako banner. */
export function installNotificationHandler() {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const rest = n.request.content.categoryIdentifier === REST_CATEGORY;
      return { shouldShowBanner: !rest, shouldShowList: !rest, shouldPlaySound: false, shouldSetBadge: false };
    },
  });
}

async function ensureChannels(names: { social: string; reminders: string }) {
  if (Platform.OS !== 'android' || channelsReady) return;
  await Notifications.setNotificationChannelAsync('social', { name: names.social, importance: AndroidImportance.HIGH });
  await Notifications.setNotificationChannelAsync('reminders', { name: names.reminders, importance: AndroidImportance.DEFAULT });
  channelsReady = true;
}

export async function hasNotificationPermission() {
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Zeptá se na povolení (jen pokud ještě nebylo zamítnuto natrvalo). */
export async function requestNotificationPermission(names: { social: string; reminders: string }) {
  try {
    await ensureChannels(names);
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!cur.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Zaregistruje zařízení pro vzdálená oznámení (jen s udělením povolení, bez dotazu). */
export async function registerDevice(lang: string, prefs: { coach: boolean; messages: boolean }, names: { social: string; reminders: string }) {
  if (!(await hasNotificationPermission())) return;
  try {
    await ensureChannels(names);
    const { data } = await Notifications.getExpoPushTokenAsync();
    lastToken = data;
    await api.registerPushToken(data, Platform.OS === 'ios' ? 'ios' : 'android', lang, prefs);
  } catch {
    // bez EAS projektu (vývoj v Expo Go) nebo bez signálu – zkusíme příště
  }
}

/** Před odhlášením: zařízení už nemá dostávat oznámení odhlášeného účtu. */
export async function forgetDevice() {
  if (!lastToken) return;
  try {
    await api.unregisterPushToken(lastToken);
  } catch {}
  lastToken = null;
}

export interface Reminder {
  id: string;
  at: Date;
  title: string;
  body: string;
  url: string;
}

/** Nahradí všechny naplánované připomínky aplikace novým seznamem. */
export async function syncReminders(list: Reminder[], names: { social: string; reminders: string }) {
  try {
    const now = Date.now();
    const planned = await Notifications.getAllScheduledNotificationsAsync();
    const want = new Map(list.filter((r) => r.at.getTime() > now + 60000).map((r) => [PREFIX + r.id, r]));
    for (const n of planned) {
      if (n.identifier.startsWith(PREFIX) && !want.has(n.identifier)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (!want.size || !(await hasNotificationPermission())) return;
    await ensureChannels(names);
    for (const [identifier, r] of want) {
      // stejné id = přeplánujeme (čas nebo text se mohl změnit)
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: r.title, body: r.body, data: { url: r.url }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: 'reminders' },
      });
    }
  } catch {
    // plánování oznámení je doplněk – chyba nesmí rozbít aplikaci
  }
}

/** Klepnutí na oznámení otevře příslušnou obrazovku (i když byla aplikace zavřená). */
export function onNotificationOpen(open: (url: string) => void) {
  const handle = (r: Notifications.NotificationResponse | null) => {
    const url = r?.notification.request.content.data?.url;
    if (typeof url === 'string' && r?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      open(url);
      Notifications.clearLastNotificationResponse();
    }
  };
  handle(Notifications.getLastNotificationResponse());
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
