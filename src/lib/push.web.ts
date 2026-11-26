/** Web (PWA): oznámení mimo aplikaci nepodporujeme – všechny funkce nic nedělají. */
export const pushSupported = false;
export interface Reminder {
  id: string;
  at: Date;
  title: string;
  body: string;
  url: string;
}
export function installNotificationHandler() {}
export async function hasNotificationPermission() {
  return false;
}
export async function requestNotificationPermission(_names: { social: string; reminders: string }) {
  return false;
}
export async function registerDevice(_lang: string, _prefs: { coach: boolean; messages: boolean }, _names: { social: string; reminders: string }) {}
export async function forgetDevice() {}
export async function syncReminders(_list: Reminder[], _names: { social: string; reminders: string }) {}
export function onNotificationOpen(_open: (url: string) => void) {
  return () => {};
}
