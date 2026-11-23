import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Uloží JSON do dočasného souboru a nabídne sdílení / uložení do Souborů. */
export async function shareJson(data: unknown, fileName: string) {
  const file = new File(Paths.cache, fileName);
  await file.write(JSON.stringify(data, null, 2), {});
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: fileName });
}
