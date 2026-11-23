import type { AgeGroupId, Gender } from './types';

/**
 * Hmotnostní kategorie IWF platné od 1. 8. 2026.
 * Senioři, U23, junioři (U20) a masters používají stejné kategorie,
 * dorost (U17) má vlastní. Kategorie pro děti do 15 let aplikace neobsahuje.
 */
export const SENIOR_CATEGORIES: Record<Gender, string[]> = {
  M: ['60', '65', '70', '75', '85', '95', '110', '+110'],
  F: ['49', '53', '57', '61', '69', '77', '86', '+86'],
};

export const YOUTH_CATEGORIES: Record<Gender, string[]> = {
  M: ['55', '60', '65', '70', '75', '85', '95', '+95'],
  F: ['45', '49', '53', '57', '61', '69', '77', '+77'],
};

export interface AgeGroup {
  id: AgeGroupId;
  /** minimální a maximální věk v daném kalendářním roce */
  minAge: number;
  maxAge: number | null;
  kind: 'youth' | 'junior' | 'senior' | 'masters';
}

export const AGE_GROUPS: AgeGroup[] = [
  { id: 'U17', minAge: 15, maxAge: 17, kind: 'youth' },
  { id: 'U20', minAge: 15, maxAge: 20, kind: 'junior' },
  { id: 'U23', minAge: 15, maxAge: 23, kind: 'junior' },
  { id: 'SENIOR', minAge: 15, maxAge: null, kind: 'senior' },
  { id: 'M35', minAge: 35, maxAge: 39, kind: 'masters' },
  { id: 'M40', minAge: 40, maxAge: 44, kind: 'masters' },
  { id: 'M45', minAge: 45, maxAge: 49, kind: 'masters' },
  { id: 'M50', minAge: 50, maxAge: 54, kind: 'masters' },
  { id: 'M55', minAge: 55, maxAge: 59, kind: 'masters' },
  { id: 'M60', minAge: 60, maxAge: 64, kind: 'masters' },
  { id: 'M65', minAge: 65, maxAge: 69, kind: 'masters' },
  { id: 'M70', minAge: 70, maxAge: 74, kind: 'masters' },
  { id: 'M75', minAge: 75, maxAge: 79, kind: 'masters' },
  { id: 'M80', minAge: 80, maxAge: 84, kind: 'masters' },
  { id: 'M85', minAge: 85, maxAge: null, kind: 'masters' },
];

export function categoriesFor(gender: Gender, ageGroup: AgeGroupId | null): string[] {
  if (ageGroup === 'U17') return YOUTH_CATEGORIES[gender];
  return SENIOR_CATEGORIES[gender];
}

/** Věk se ve vzpírání počítá podle ročníku narození (věk dosažený v daném roce). */
export function competitionAge(birthYear: number, year = new Date().getFullYear()) {
  return year - birthYear;
}

/** Navrhne nejmladší odpovídající věkovou skupinu (masters od 35 let). */
export function suggestAgeGroup(birthYear: number | null): AgeGroupId | null {
  if (!birthYear) return null;
  const age = competitionAge(birthYear);
  if (age < 15) return null;
  if (age <= 17) return 'U17';
  if (age <= 20) return 'U20';
  if (age <= 23) return 'U23';
  if (age < 35) return 'SENIOR';
  const m = AGE_GROUPS.filter((g) => g.kind === 'masters').find((g) => age >= g.minAge && (g.maxAge === null || age <= g.maxAge));
  return m?.id ?? 'SENIOR';
}

/** Skupiny, kterých se závodník daného ročníku smí účastnit. */
export function eligibleAgeGroups(birthYear: number | null): AgeGroupId[] {
  if (!birthYear) return AGE_GROUPS.map((g) => g.id);
  const age = competitionAge(birthYear);
  return AGE_GROUPS.filter((g) => age >= g.minAge && (g.maxAge === null || age <= g.maxAge)).map((g) => g.id);
}

/** Najde kategorii podle tělesné hmotnosti. */
export function categoryForBodyweight(gender: Gender, ageGroup: AgeGroupId | null, bw: number) {
  const cats = categoriesFor(gender, ageGroup);
  for (const c of cats) {
    if (c.startsWith('+')) return c;
    if (bw <= Number(c)) return c;
  }
  return cats[cats.length - 1];
}

export function formatCategory(cat: string | null) {
  if (!cat) return '—';
  return cat.startsWith('+') ? `+${cat.slice(1)} kg` : `${cat} kg`;
}

/**
 * Sinclairovy koeficienty pro olympijský cyklus 2025–2028.
 * Ověřeno proti oficiálním tabulkám „Sinclair Coefficients (2025-2028)“ (shoda na 6 desetinných míst).
 * Sinclair = dvojboj × 10^(A · log10(hmotnost / b)²) pro hmotnost menší než b, jinak koeficient 1.
 */
export const SINCLAIR = {
  M: { A: 0.700767794, b: 201.159007 },
  F: { A: 0.674107962, b: 163.918008 },
};

export function sinclairCoefficient(gender: Gender, bodyweight: number) {
  if (!Number.isFinite(bodyweight) || bodyweight <= 0) return 1;
  const { A, b } = SINCLAIR[gender];
  if (bodyweight >= b) return 1;
  const x = Math.log10(bodyweight / b);
  return Math.pow(10, A * x * x);
}

/** Jediné místo, kde se Sinclairovy body počítají (profil, kalkulačka, export). */
export function sinclairTotal(gender: Gender, bodyweight: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return total * sinclairCoefficient(gender, bodyweight);
}

const AGE_LABELS: Record<'cs' | 'en' | 'sk', Record<'U17' | 'U20' | 'U23' | 'SM' | 'SF' | 'S' | 'MASTERS', string>> = {
  cs: { U17: 'Dorost (U17)', U20: 'Junioři (U20)', U23: 'U23', SM: 'Muži', SF: 'Ženy', S: 'Dospělí', MASTERS: 'Masters' },
  en: { U17: 'Youth (U17)', U20: 'Junior (U20)', U23: 'U23', SM: 'Men', SF: 'Women', S: 'Senior', MASTERS: 'Masters' },
  sk: { U17: 'Dorast (U17)', U20: 'Juniori (U20)', U23: 'U23', SM: 'Muži', SF: 'Ženy', S: 'Dospelí', MASTERS: 'Masters' },
};

export function ageGroupLabel(id: AgeGroupId | null, gender: Gender | null, lang: 'cs' | 'en' | 'sk') {
  if (!id) return '—';
  const L = AGE_LABELS[lang];
  if (id === 'U17' || id === 'U20' || id === 'U23') return L[id];
  if (id === 'SENIOR') return gender === 'M' ? L.SM : gender === 'F' ? L.SF : L.S;
  const g = AGE_GROUPS.find((a) => a.id === id)!;
  return `${L.MASTERS} ${g.minAge}${g.maxAge ? `–${g.maxAge}` : '+'}`;
}
