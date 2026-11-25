import { EXERCISES } from '../data/exercises';
import type { LoggedSet } from './types';

/**
 * Rychlý zápis tréninku textem (i diktováním z klávesnice). Jeden řádek = jeden cvik:
 *   Trh 70x2x3, 75x2          → 3× 2 opak. 70 kg, 1× 2 opak. 75 kg
 *   Dřep 5x5 100              → 5 nástupů po 5 opak. se 100 kg
 *   Nadhoz 3x1@85%            → 3× 1 opak. na 85 % maxima
 *   Shyby 3x10                → 3× 10 opak. bez zátěže
 *   přední dřep 100 kg 3 krát 3
 * Váha se pozná podle „kg“, „@“ nebo podle velikosti čísla (≥ 20).
 */

export interface ParsedExercise {
  /** id cviku z katalogu, nebo null = vlastní cvik */
  exerciseId: string | null;
  name: string;
  sets: LoggedSet[];
  /** řádek, kterému nerozumíme (zobrazí se uživateli) */
  error?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** běžné zkratky a hovorové názvy */
const ALIASES: Record<string, string> = {
  drep: 'back_squat',
  'zadni drep': 'back_squat',
  'drep zadni': 'back_squat',
  'predni drep': 'front_squat',
  'drep predni': 'front_squat',
  cj: 'clean_jerk',
  'c j': 'clean_jerk',
  nadhod: 'clean_jerk',
  premisteni: 'clean',
  mrtvak: 'deadlift',
  'mrtvy tah': 'deadlift',
  rdl: 'rdl',
  bench: 'bench_press',
  tlak: 'strict_press',
  vyraz: 'jerk',
  shyby: 'pullups',
  zhyby: 'pullups',
  hyperextenze: 'back_ext',
  'power snatch': 'power_snatch',
  'power clean': 'power_clean',
  ohs: 'overhead_squat',
};

const CATALOG = EXERCISES.flatMap((e) => Object.values(e.name).map((n) => ({ id: e.id, key: norm(n) })));

/** Najde cvik podle názvu (přesná shoda, zkratka, začátek, obsahuje). */
export function matchExercise(raw: string, custom: { id: string; name: string }[] = []): string | null {
  const q = norm(raw);
  if (!q) return null;
  const all = [...CATALOG, ...custom.map((c) => ({ id: c.id, key: norm(c.name) }))];
  const exact = all.find((c) => c.key === q);
  if (exact) return exact.id;
  if (ALIASES[q]) return ALIASES[q];
  // nejkratší název, který začíná dotazem (např. „trh“ → Trh, ne Trh z visu)
  const starts = all.filter((c) => c.key.startsWith(q)).sort((a, b) => a.key.length - b.key.length)[0];
  if (starts) return starts.id;
  const contains = all.filter((c) => c.key.includes(q) || q.includes(c.key)).sort((a, b) => b.key.length - a.key.length)[0];
  return contains?.id ?? null;
}

/** Jedna skupina nástupů z textu (např. „70x2x3“, „5x5 100“, „3x1@85%“). */
function parseChunk(chunk: string, maxKg: number | null): LoggedSet[] | null {
  let s = chunk
    .toLowerCase()
    .replace(/,(\d)/g, '.$1') // 82,5 kg → 82.5
    .replace(/[×*]/g, 'x')
    .replace(/\s*krat\s*|\s*krát\s*|\s*times\s*/g, 'x')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;

  // procenta z maxima: 3x2@75% (3 nástupy po 2) / 2@80%
  const pct = s.match(/^(?:(\d+)\s*x\s*)?(\d+)\s*@\s*(\d+(?:\.\d+)?)\s*%$/);
  if (pct) {
    if (!maxKg) return null;
    return rep(pct[1] ? Number(pct[1]) : 1, Number(pct[2]), Math.round((maxKg * Number(pct[3])) / 100));
  }

  // zavináč: 3x2@70 / 2@70
  const at = s.match(/^(?:(\d+)\s*x\s*)?(\d+)\s*@\s*(\d+(?:\.\d+)?)\s*(?:kg)?$/);
  if (at) {
    return rep(at[1] ? Number(at[1]) : 1, Number(at[2]), Number(at[3]));
  }

  // váha s „kg“ kdekoli: „100 kg 3x3“, „3x3 100kg“, „100kg x5“
  const kgm = s.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (kgm) {
    const kg = Number(kgm[1]);
    const rest = s
      .replace(kgm[0], ' ')
      .replace(/^\s*x\s*|\s*x\s*$/g, '')
      .trim();
    const nums = rest.match(/\d+/g)?.map(Number) ?? [];
    if (nums.length === 0) return rep(1, 1, kg);
    if (nums.length === 1) return rep(1, nums[0], kg);
    // „3x5“ = nástupy x opakování
    return rep(nums[0], nums[1], kg);
  }

  const nums = s.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  // „5x5 100“ – nástupy x opakování a váha zvlášť
  const sep = s.match(/^(\d+)\s*x\s*(\d+)\s+(\d+(?:\.\d+)?)$/);
  if (sep) return rep(Number(sep[1]), Number(sep[2]), Number(sep[3]));
  if (nums.length === 3) {
    // „70x2x3“ (váha x opak. x nástupy) nebo „3x2x70“ (nástupy x opak. x váha)
    if (nums[0] >= 20 && nums[2] < 20) return rep(nums[2], nums[1], nums[0]);
    if (nums[2] >= 20) return rep(nums[0], nums[1], nums[2]);
    return rep(nums[2], nums[1], nums[0]);
  }
  if (nums.length === 2) {
    const [a, b] = nums;
    // „70x2“ = váha x opakování, „2x70“ = opakování x váha, „3x10“ = nástupy x opakování bez zátěže
    if (a >= 20 && b < 20) return rep(1, b, a);
    if (b >= 20 && a < 20) return rep(1, a, b);
    return rep(a, b, 0);
  }
  if (nums.length === 1) return rep(1, 1, nums[0]);
  return null;
}

function rep(n: number, reps: number, kg: number): LoggedSet[] | null {
  if (!Number.isFinite(n) || !Number.isFinite(reps) || n < 1 || n > 30 || reps < 1 || reps > 100 || kg < 0 || kg > 500)
    return null;
  return Array.from({ length: n }, () => ({ reps, kg, done: true }));
}

/** Rozdělí řádek na název cviku a zápis nástupů (vše od prvního čísla). */
export function parseLine(
  line: string,
  custom: { id: string; name: string }[] = [],
  maxes: Record<string, number> = {},
): ParsedExercise | null {
  const clean = line.replace(/^[\s\-•*·]+/, '').trim();
  if (!clean) return null;
  const firstDigit = clean.search(/\d/);
  const nameRaw = (firstDigit < 0 ? clean : clean.slice(0, firstDigit)).replace(/[:\-–]+\s*$/, '').trim();
  const spec = firstDigit < 0 ? '' : clean.slice(firstDigit);
  const exerciseId = matchExercise(nameRaw, custom);
  const name = nameRaw || clean;
  if (!spec) return { exerciseId, name, sets: [], error: 'noSets' };
  const max = exerciseId ? (maxes[exerciseId] ?? null) : null;
  const sets: LoggedSet[] = [];
  for (const chunk of splitGroups(spec)) {
    const part = parseChunk(chunk, max);
    if (!part) return { exerciseId, name, sets, error: chunk.includes('%') && !max ? 'noMax' : 'format' };
    sets.push(...part);
  }
  return { exerciseId, name, sets };
}

export function parseQuickLog(text: string, custom: { id: string; name: string }[] = [], maxes: Record<string, number> = {}) {
  return text
    .split(/\n+/)
    .map((l) => parseLine(l, custom, maxes))
    .filter((x): x is ParsedExercise => !!x);
}

/** Skupiny nástupů oddělené čárkou, středníkem, lomítkem – nebo mezerou mezi zápisy typu „70x2x3 75x2“. */
function splitGroups(spec: string) {
  const out: string[] = [];
  // desetinná čárka (82,5 kg) není oddělovač – oddělovač je čárka před další skupinou (…, 75x2)
  spec = spec.replace(/(\d),(\d+)(?!\d*\s*[x×*@])/g, '$1.$2');
  for (const part of spec.split(/\s*[;,/]\s*(?=\d)/)) {
    const p = part.trim().replace(/[×*]/g, 'x');
    const groups = /^\d+(?:[.,]\d+)?\s*x\s*\d+(?:\s*x\s*\d+)?(?:\s+\d+(?:[.,]\d+)?\s*x\s*\d+(?:\s*x\s*\d+)?)+$/.test(p);
    if (groups) out.push(...p.split(/\s+(?=\d+(?:[.,]\d+)?\s*x)/));
    else if (p) out.push(p);
  }
  return out;
}
