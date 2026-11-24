import { useEffect } from 'react';
import { Platform } from 'react-native';
import { emitRestEvent } from '../lib/restEvents';
import { ACTION_DONE, ACTION_EXTEND, Notifications, type RestNotificationData } from '../lib/restNotifications';
import { useTraining } from '../providers/TrainingProvider';

/**
 * Zpracuje klepnutí na „Odškrtnout nástup“ v oznámení (zamčená obrazovka) –
 * nástup se odškrtne v rozpracovaném tréninku, aniž by bylo nutné otevírat aplikaci.
 */
export function RestNotificationBridge() {
  const { updateActive } = useTraining();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      if (r.actionIdentifier === ACTION_EXTEND) return emitRestEvent({ type: 'extend', seconds: 30 });
      if (r.actionIdentifier !== ACTION_DONE) return;
      const d = r.notification.request.content.data as unknown as RestNotificationData | undefined;
      if (!d) return;
      updateActive((w) => ({
        ...w,
        exercises: w.exercises.map((e) =>
          e.id === d.loggedExId ? { ...e, sets: e.sets.map((s, i) => (i === d.setIndex ? { ...s, done: true } : s)) } : e,
        ),
      }));
    });
    return () => sub.remove();
  }, [updateActive]);
  return null;
}
