export type Unit = 'kg' | 'lb';

export const KG_PER_LB = 0.45359237;

export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;

/** Převede kg na zobrazovanou hodnotu v dané jednotce. */
export function toDisplay(kg: number, unit: Unit) {
  return unit === 'kg' ? kg : kgToLb(kg);
}

/** Převede zadanou hodnotu z jednotky na kg. */
export function fromDisplay(value: number, unit: Unit) {
  return unit === 'kg' ? value : lbToKg(value);
}

/** Váhy se zaokrouhlují vždy na celá kila (žádné půlkilo). */
export const ROUND_KG = 1;

/** Hodnotu zadanou v dané jednotce převede na kg pro uložení (kg → celé číslo, lb → přesně). */
export function toStoredKg(value: number, unit: Unit) {
  return unit === 'kg' ? Math.round(value) : Math.round(lbToKg(value) * 100) / 100;
}

export function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

let DECIMAL = ',';
/** Nastaví desetinný oddělovač podle jazyka (cs/sk čárka, en tečka). */
export function setDecimalSeparator(sep: ',' | '.') {
  DECIMAL = sep;
}

export function formatNumber(n: number, decimals = 1) {
  const r = Math.round(n * 10 ** decimals) / 10 ** decimals;
  return Number.isInteger(r) ? String(r) : r.toFixed(decimals).replace('.', DECIMAL);
}

export function formatWeight(kg: number | null | undefined, unit: Unit, opts?: { suffix?: boolean }) {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return '—';
  const v = unit === 'kg' ? Math.round(kg) : Math.round(kgToLb(kg));
  const s = formatNumber(v, 0);
  return opts?.suffix === false ? s : `${s} ${unit}`;
}

/** Parsuje číslo zadané uživatelem (akceptuje čárku). */
export function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : null;
}

export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 2, 1.5, 1, 0.5];
export const PLATES_LB = [55, 45, 35, 25, 10, 5, 2.5];

/** Vrátí kotouče na jednu stranu osy (greedy, standardní sada). */
export function platesPerSide(total: number, bar: number, collars: number, plates: number[]) {
  let rest = (total - bar - collars) / 2;
  if (rest < 0) return { plates: [] as number[], remainder: rest * 2 };
  const out: number[] = [];
  for (const p of plates) {
    while (rest + 1e-9 >= p) {
      out.push(p);
      rest -= p;
    }
  }
  return { plates: out, remainder: Math.round(rest * 2 * 100) / 100 };
}

/** Barvy kotoučů dle IWF */
export const PLATE_COLORS: Record<string, string> = {
  '25': '#D4060D',
  '20': '#1E5BD8',
  '15': '#F2C230',
  '10': '#4CBB17',
  '5': '#F4F4F4',
  '2.5': '#D4060D',
  '2': '#1E5BD8',
  '1.5': '#F2C230',
  '1': '#4CBB17',
  '0.5': '#F4F4F4',
  '55': '#D4060D',
  '45': '#1E5BD8',
  '35': '#F2C230',
};
