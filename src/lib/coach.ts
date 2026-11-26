import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { addDays, parseISODate, startOfWeek, toISODate, todayISO, weekdayMon0 } from './date';
import { readiness, readinessLevel } from './wellness';
import { logSetCount, logTonnage } from './training';
import type { TeamMember, TrainingData, WellnessEntry, WorkoutLog } from './types';

/** Odkaz, kterým se svěřenec připojí k trenérovi (otevře obrazovku s potvrzením). */
export function joinLink(coachId: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const base = window.location.pathname.startsWith('/zvedej') ? '/zvedej' : '';
    return `${window.location.origin}${base}/join/${coachId}`;
  }
  return Linking.createURL(`/join/${coachId}`);
}

/** Dny od posledního tréninku (null = žádný trénink za posledních 60 dní). */
export function daysSince(iso: string | null) {
  if (!iso) return null;
  const ms = parseISODate(todayISO()).getTime() - parseISODate(iso).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/** Souhrn svěřence pro přehled týmu. */
export function memberSummary(m: TeamMember) {
  const logs = [...m.recentLogs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const last = logs[0] ?? null;
  const monday = toISODate(startOfWeek(new Date()));
  const thisWeek = logs.filter((l) => l.date >= monday).length;
  // poznámka z posledních 7 dní (např. bolest) – trenér ji uvidí zvýrazněnou
  const weekAgo = toISODate(addDays(new Date(), -7));
  const note = logs.find((l) => l.date >= weekAgo && l.notes?.trim()) ?? null;
  return {
    last,
    days: daysSince(last?.date ?? null),
    thisWeek,
    note,
  };
}

/** Tonáž a počet tréninků za aktuální kalendářní měsíc. */
export function monthStats(logs: WorkoutLog[], ref = new Date()) {
  const from = toISODate(new Date(ref.getFullYear(), ref.getMonth(), 1));
  const list = logs.filter((l) => l.date >= from);
  return {
    count: list.length,
    tonnage: list.reduce((a, l) => a + logTonnage(l), 0),
    sets: list.reduce((a, l) => a + logSetCount(l), 0),
  };
}

/** Nejtěžší zapsaná váha cviku v každém tréninku (pro graf vývoje). */
export function bestLiftSeries(logs: WorkoutLog[], exerciseId: string) {
  return logs
    .map((l) => {
      const kgs = l.exercises
        .filter((e) => e.exerciseId === exerciseId)
        .flatMap((e) => e.sets.filter((s) => s.done).map((s) => s.kg));
      return kgs.length ? { date: l.date, kg: Math.max(...kgs) } : null;
    })
    .filter((x): x is { date: string; kg: number } => !!x)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Tonáž po týdnech (posledních `weeks` týdnů, nejstarší první). */
export function weeklyTonnage(logs: WorkoutLog[], weeks = 8) {
  const monday = startOfWeek(new Date());
  return Array.from({ length: weeks }, (_, i) => {
    const start = toISODate(addDays(monday, -7 * (weeks - 1 - i)));
    const end = toISODate(addDays(parseISODate(start), 6));
    const list = logs.filter((l) => l.date >= start && l.date <= end);
    return { week: start, tonnage: list.reduce((a, l) => a + logTonnage(l), 0), count: list.length };
  });
}

/** Cviky, které svěřenec v deníku dělal nejčastěji (pro výběr grafu). */
export function topExercises(logs: WorkoutLog[], n = 6) {
  const count = new Map<string, number>();
  for (const l of logs) for (const e of l.exercises) count.set(e.exerciseId, (count.get(e.exerciseId) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id]) => id);
}

/** Vývoj zapsaného maxima cviku (z historie; bez historie aspoň dnešní hodnota). */
export function maxSeries(data: TrainingData, exerciseId: string) {
  const hist = (data.maxHistory ?? [])
    .filter((h) => h.exerciseId === exerciseId)
    .map((h) => ({ date: h.date, kg: h.kg }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const cur = data.maxes[exerciseId];
  if (!hist.length && cur) return [{ date: todayISO(), kg: cur }];
  return hist;
}

/** Tonáž po měsících (posledních `months` měsíců, nejstarší první). */
export function monthlyTonnage(logs: WorkoutLog[], months = 6) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const from = toISODate(d);
    const to = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const list = logs.filter((l) => l.date >= from && l.date <= to);
    return { month: from, tonnage: list.reduce((a, l) => a + logTonnage(l), 0), count: list.length };
  });
}

export interface TeamTodayRow {
  member: TeamMember;
  /** dnešní tréninky */
  today: WorkoutLog[];
  /** má dnes trénink podle plánu */
  plannedToday: boolean;
  /** plánované dny za poslední 3 dny bez zapsaného tréninku (nejnovější první) */
  missed: string[];
  /** nejnovější záznam regenerace za 2 dny (jen se souhlasem svěřence) */
  wellness: WellnessEntry | null;
  readiness: number | null;
  /** bolest z regenerace nebo „bolest / špatný pocit“ z tréninku za 3 dny */
  pain: { area: string | null; level: number | null; note: string | null } | null;
  days: number | null;
}

/** Přehled týmu „na jedné obrazovce“: kdo dnes trénoval, kdo vynechal, kdo hlásí bolest, nízká připravenost. */
export function teamToday(team: TeamMember[], now = new Date()) {
  const today = toISODate(now);
  const twoDays = toISODate(addDays(now, -2));
  const threeDays = toISODate(addDays(now, -3));
  const rows: TeamTodayRow[] = team
    .filter((m) => m.status === 'accepted')
    .map((m) => {
      const planned = new Set(m.planWeekdays ?? []);
      const logged = new Set(m.recentLogs.map((l) => l.date));
      const missed: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const d = addDays(now, -i);
        const iso = toISODate(d);
        // vynechaný den počítáme jen od chvíle, kdy byl svěřenec v týmu
        if (planned.has(weekdayMon0(d)) && !logged.has(iso) && iso >= m.createdAt.slice(0, 10)) missed.push(iso);
      }
      const wellness =
        [...m.recentWellness].filter((w) => w.date >= twoDays).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
      const badLog = m.recentLogs
        .filter((l) => l.date >= threeDays && l.feeling === 'bad')
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const pain = wellness?.pain
        ? { area: wellness.pain.area, level: wellness.pain.level, note: wellness.note ?? null }
        : badLog
          ? { area: null, level: null, note: badLog.notes?.trim() || null }
          : null;
      return {
        member: m,
        today: m.recentLogs.filter((l) => l.date === today),
        plannedToday: planned.has(weekdayMon0(now)),
        missed,
        wellness,
        readiness: wellness ? readiness(wellness) : null,
        pain,
        days: memberSummary(m).days,
      };
    });
  return {
    total: rows.length,
    pain: rows.filter((r) => r.pain),
    lowReadiness: rows.filter((r) => r.readiness !== null && readinessLevel(r.readiness) === 'low'),
    missed: rows.filter((r) => r.missed.length > 0),
    trainedToday: rows.filter((r) => r.today.length > 0),
    plannedToday: rows.filter((r) => r.plannedToday && r.today.length === 0),
    inactive: rows.filter((r) => r.days === null || r.days >= 7),
  };
}
