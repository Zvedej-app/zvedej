/** Datumové pomocníky. Měsíce výzvy se řídí časem Europe/Prague. */

const TZ = 'Europe/Prague';

function pragueParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') };
}

/** Aktuální měsíc výzvy ve tvaru YYYY-MM (pražský čas). */
export function currentMonthKey(now = new Date()) {
  const p = pragueParts(now);
  return `${p.y}-${String(p.m).padStart(2, '0')}`;
}

export function prevMonthKey(key: string) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Zbývající čas do konce měsíce (pražský čas). */
export function timeLeftInMonth(now = new Date()) {
  const p = pragueParts(now);
  const daysInMonth = new Date(Date.UTC(p.y, p.m, 0)).getUTCDate();
  const minutesLeft = (daysInMonth - p.d) * 24 * 60 + (23 - p.h) * 60 + (60 - p.min);
  return { days: Math.floor(minutesLeft / 1440), hours: Math.floor((minutesLeft % 1440) / 60), minutesLeft };
}

export function formatMonth(key: string, locale: string) {
  const [y, m] = key.split('-').map(Number);
  const s = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* --------- lokální kalendářní data (YYYY-MM-DD) pro tréninky --------- */

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function parseISODate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 0 = pondělí … 6 = neděle */
export function weekdayMon0(d: Date) {
  return (d.getDay() + 6) % 7;
}

export function startOfWeek(d: Date) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - weekdayMon0(r));
  return r;
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function nextMonday(from = new Date()) {
  return addDays(startOfWeek(from), 7);
}

/** Pořadí týdne od data startu (1 = první týden). */
export function weekNumberSince(startISO: string, now = new Date()) {
  const start = startOfWeek(parseISODate(startISO));
  const cur = startOfWeek(now);
  const diff = Math.round((cur.getTime() - start.getTime()) / (7 * 86400000));
  return Math.max(1, diff + 1);
}

export function weeksBetween(aISO: string, bISO: string) {
  const a = startOfWeek(parseISODate(aISO));
  const b = startOfWeek(parseISODate(bISO));
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (7 * 86400000)) + 1);
}

export function formatDate(iso: string | null | undefined, locale: string, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '';
  const d = iso.length === 10 ? parseISODate(iso) : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, opts ?? { day: 'numeric', month: 'numeric', year: 'numeric' }).format(d);
}

export function relativeDays(iso: string) {
  const d = parseISODate(iso);
  const t = parseISODate(todayISO());
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}
