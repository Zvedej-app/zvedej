import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';
import type { RestSound } from './restSound';

/**
 * Oznámení o konci pauzy (zobrazí se i na zamčené obrazovce).
 * Má tlačítko „Odškrtnout nástup“ – akci zpracuje <RestNotificationBridge />.
 * Na webu (PWA) se nepoužívá.
 */
export const REST_CATEGORY = 'REST';
export const ACTION_DONE = 'DONE';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
let ready = false;

export async function setupRestNotifications(actionTitle: string) {
  if (!supported || ready) return ready;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        // ve spuštěné aplikaci pauzu ukazuje přímo obrazovka tréninku
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      for (const s of ['gong', 'whistle', 'bell', 'none']) {
        await Notifications.setNotificationChannelAsync(`rest-${s}`, {
          name: `Pauza (${s})`,
          importance: AndroidImportance.HIGH,
          sound: s === 'none' ? null : `${s}.wav`,
          lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
        });
      }
    }
    await Notifications.setNotificationCategoryAsync(REST_CATEGORY, [
      { identifier: ACTION_DONE, buttonTitle: actionTitle, options: { opensAppToForeground: false } },
    ]);
    ready = true;
  } catch {
    ready = false;
  }
  return ready;
}

export async function ensureNotificationPermission() {
  if (!supported) return false;
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

export interface RestNotificationData {
  exerciseId: string;
  /** id cviku v rozpracovaném tréninku */
  loggedExId: string;
  setIndex: number;
}

/** Naplánuje oznámení na konec pauzy. Vrací id pro pozdější zrušení. */
export async function scheduleRestEnd(opts: {
  seconds: number;
  title: string;
  body: string;
  sound: RestSound;
  data: RestNotificationData;
}) {
  if (!supported || !ready || opts.seconds < 1) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: opts.title,
        body: opts.body,
        categoryIdentifier: REST_CATEGORY,
        sound: opts.sound === 'none' ? false : `${opts.sound}.wav`,
        data: opts.data as unknown as Record<string, unknown>,
        interruptionLevel: 'timeSensitive',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(opts.seconds),
        channelId: `rest-${opts.sound}`,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelRestNotification(id: string | null) {
  if (!supported || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

export { Notifications };

const ONGOING_ID = 'rest-ongoing';

/**
 * Android: trvalé oznámení po dobu pauzy (viditelné na zamčené obrazovce)
 * s tlačítkem „Odškrtnout nástup“. Na iOS tuto roli plní Live Activity.
 */
export async function showRestOngoing(opts: { title: string; body: string; data: RestNotificationData }) {
  if (Platform.OS !== 'android' || !ready) return;
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: ONGOING_ID,
      content: {
        title: opts.title,
        body: opts.body,
        categoryIdentifier: REST_CATEGORY,
        sticky: true,
        autoDismiss: false,
        sound: false,
        data: opts.data as unknown as Record<string, unknown>,
      },
      trigger: { channelId: 'rest-none' } as Notifications.NotificationTriggerInput,
    });
  } catch {}
}

export async function hideRestOngoing() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.dismissNotificationAsync(ONGOING_ID);
  } catch {}
}
