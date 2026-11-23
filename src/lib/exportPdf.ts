import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Lang } from './i18n';
import type { TrainingData } from './types';
import type { Unit } from './units';
import { trainingHtml } from './exportDoc';

/** Vytvoří PDF s tréninky a nabídne sdílení / uložení do Souborů. */
export async function exportTrainingPdf(data: TrainingData, lang: Lang, unit: Unit, owner: string) {
  const html = trainingHtml(data, lang, unit, owner);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Zvedej – tréninky' });
  } else {
    await Print.printAsync({ uri });
  }
}
