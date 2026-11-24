/** Datum narození a minimální věk pro registraci. */
/** nejnižší věk pro registraci (mladší i se souhlasem rodiče ne) */
export const MIN_AGE = 13;

/** věk pro samostatný souhlas se zpracováním údajů (GDPR čl. 8): Česko 15, Slovensko a jinde 16 */
export function consentAge(country: 'CZ' | 'SK' | 'OTHER') {
  return country === 'CZ' ? 15 : 16;
}

/** Den/měsíc/rok → YYYY-MM-DD, nebo null pro neplatné datum */
export function parseBirthDate(d: string, m: string, y: string): string | null {
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  if (!day || !month || y.length !== 4 || year < 1920) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  if (date > new Date()) return null;
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function ageOn(iso: string, now: Date) {
  const [y, m, d] = iso.split('-').map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}
