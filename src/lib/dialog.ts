import { Alert, Platform } from 'react-native';

/** Potvrzovací dialog fungující na mobilu i na webu. */
export function confirm(message: string, opts: { ok: string; cancel: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(message) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(message, undefined, [
      { text: opts.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: opts.ok, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

export function notify(message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message);
  } else Alert.alert(message);
}
