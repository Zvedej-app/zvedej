import * as Sharing from 'expo-sharing';
import type { CardRef } from '../components/share/ShareCard';
import { captureRef } from 'react-native-view-shot';

/** Vyfotí view (sdílecí kartu) jako PNG v daném rozlišení a otevře nabídku sdílení (Instagram, WhatsApp…). */
export async function shareViewAsImage(view: CardRef | null, opts: { width: number; height: number; title: string; fileName: string }) {
  if (!view) return;
  const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile', width: opts.width, height: opts.height });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: opts.title, UTI: 'public.png' });
  }
}
