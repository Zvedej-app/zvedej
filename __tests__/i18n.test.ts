import { describe, expect, test } from '@jest/globals';
import { DICTS } from '../src/lib/i18n';

describe('Překlady', () => {
  const cs = Object.keys(DICTS.cs).sort();
  test.each(['en', 'sk'] as const)('%s má všechny klíče jako čeština', (lang) => {
    const keys = Object.keys(DICTS[lang]);
    expect(cs.filter((k) => !keys.includes(k))).toEqual([]);
  });
  test('žádný prázdný text', () => {
    for (const lang of ['cs', 'en', 'sk'] as const)
      for (const [k, v] of Object.entries(DICTS[lang])) if (!String(v).trim()) throw new Error(`${lang}: ${k}`);
  });
  test('stejné proměnné {name} ve všech jazycích', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const k of cs) {
      const c = vars(String((DICTS.cs as Record<string, string>)[k]));
      for (const lang of ['en', 'sk'] as const) {
        const v = (DICTS[lang] as Record<string, string>)[k];
        if (v !== undefined && vars(String(v)) !== c) throw new Error(`${lang}: ${k} (${vars(String(v))} ≠ ${c})`);
      }
    }
  });
});
