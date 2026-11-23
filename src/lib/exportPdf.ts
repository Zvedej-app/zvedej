import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { exerciseName } from '../data/exercises';
import { formatDate } from './date';
import { translate, type Lang, LOCALES } from './i18n';
import { logSetCount, logTonnage } from './training';
import type { TrainingData } from './types';
import { formatNumber, formatWeight, type Unit } from './units';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Sestaví tištěnou podobu tréninků (HTML → PDF). */
export function trainingHtml(data: TrainingData, lang: Lang, unit: Unit, owner: string) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  const locale = LOCALES[lang];
  const logs = [...data.logs].sort((a, b) => b.date.localeCompare(a.date));
  const maxes = Object.entries(data.maxes);

  const maxRows = maxes
    .map(([id, kg]) => `<tr><td>${esc(exerciseName(id, lang, data.customExercises))}</td><td class="r">${esc(formatWeight(kg, unit))}</td></tr>`)
    .join('');

  const logHtml = logs
    .map((l) => {
      const exs = l.exercises
        .map((e) => {
          const sets = e.sets.map((s) => `${s.reps}×${formatNumber(unit === 'kg' ? s.kg : s.kg / 0.45359237, 0)}`).join(', ');
          return `<tr><td>${esc(exerciseName(e.exerciseId, lang, data.customExercises, e.customName))}</td><td>${esc(sets)} ${unit}</td></tr>`;
        })
        .join('');
      return `<section><h3>${esc(l.title)} <span>${esc(formatDate(l.date, locale))}</span></h3>
        <p class="meta">${logSetCount(l)} ${esc(t('tr.set').toLowerCase())} · ${esc(formatWeight(logTonnage(l), unit))}${l.rpe ? ` · RPE ${l.rpe}` : ''}${l.durationMin ? ` · ${l.durationMin} min` : ''}</p>
        <table>${exs}</table>${l.notes ? `<p class="note">${esc(l.notes)}</p>` : ''}</section>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0A1633;padding:28px;font-size:13px}
    h1{color:#11457E;margin:0 0 2px;font-size:26px} .sub{color:#5B6B84;margin:0 0 18px}
    .bar{height:5px;background:linear-gradient(90deg,#11457E 33%,#fff 33% 66%,#D7141A 66%);border:1px solid #DCE3EC;margin-bottom:18px}
    h2{font-size:15px;border-bottom:2px solid #D7141A;padding-bottom:3px;margin:22px 0 8px}
    h3{font-size:14px;margin:14px 0 2px;display:flex;justify-content:space-between} h3 span{color:#5B6B84;font-weight:400}
    .meta{color:#5B6B84;margin:0 0 4px;font-size:12px} table{width:100%;border-collapse:collapse}
    td{padding:3px 0;border-bottom:1px solid #EEF2F7} td.r{text-align:right;font-weight:700} .note{font-style:italic;margin:4px 0}
    section{break-inside:avoid}
  </style></head><body>
  <h1>Zvedej – ${esc(t('tab.training'))}</h1>
  <p class="sub">${esc(owner)} · ${esc(formatDate(new Date().toISOString(), locale))}</p><div class="bar"></div>
  ${maxRows ? `<h2>${esc(t('tr.maxes'))}</h2><table>${maxRows}</table>` : ''}
  <h2>${esc(t('tr.log'))} (${logs.length})</h2>${logHtml || `<p>${esc(t('tr.noLogs'))}</p>`}
  </body></html>`;
}

/** Vytvoří PDF s tréninky a nabídne sdílení / uložení (na webu otevře tisk → Uložit jako PDF). */
export async function exportTrainingPdf(data: TrainingData, lang: Lang, unit: Unit, owner: string) {
  const html = trainingHtml(data, lang, unit, owner);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Zvedej – tréninky' });
  }
}
