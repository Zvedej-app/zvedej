import { addDays, toISODate, todayISO } from './date';
import type { TrainingData, WellnessEntry } from './types';

export const PAIN_AREAS = ['back', 'knee', 'shoulder', 'wrist', 'elbow', 'hip', 'ankle', 'other'] as const;
export type PainArea = (typeof PAIN_AREAS)[number];

/**
 * Připravenost k tréninku 0–100 z denního záznamu:
 * průměr škál (spánek, energie, svaly, nálada), krátký spánek a bolest ji snižují.
 */
export function readiness(e: WellnessEntry): number {
  const avg = (e.sleep + e.energy + e.soreness + e.mood) / 4; // 1–5
  let score = ((avg - 1) / 4) * 100;
  if (e.sleepHours !== null && e.sleepHours < 6) score -= (6 - e.sleepHours) * 6;
  if (e.pain) score -= e.pain.level * 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export type ReadinessLevel = 'good' | 'ok' | 'low';
export function readinessLevel(score: number): ReadinessLevel {
  return score >= 70 ? 'good' : score >= 45 ? 'ok' : 'low';
}

export function wellnessFor(data: TrainingData, date = todayISO()) {
  return (data.wellness ?? []).find((w) => w.date === date) ?? null;
}

/** Posledních `days` dní (nejstarší první) – pro graf; dny bez záznamu vynechá. */
export function wellnessSeries(entries: WellnessEntry[], days = 28) {
  const from = toISODate(addDays(new Date(), -(days - 1)));
  return [...entries]
    .filter((e) => e.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, score: readiness(e), pain: !!e.pain }));
}

/** Průměrná připravenost za posledních 7 dní (nebo null) */
export function weekReadiness(entries: WellnessEntry[]) {
  const s = wellnessSeries(entries, 7);
  return s.length ? Math.round(s.reduce((a, x) => a + x.score, 0) / s.length) : null;
}
