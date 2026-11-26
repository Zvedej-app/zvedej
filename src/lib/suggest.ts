import { bestKg } from './training';
import type { LoggedExercise, TrainingData } from './types';
import { roundTo } from './units';
import { readiness, readinessLevel, wellnessFor } from './wellness';

/**
 * Návrh vah podle formy:
 *  - nízká připravenost z deníku regenerace → ubrat 5 % ze všech ještě neodškrtnutých nástupů,
 *  - cvik minule šel lehce (RPE ≤ 7 nebo pocit „lehké“) → přidat 2,5 kg,
 *  - minule těžké (RPE ≥ 9,5 nebo pocit „těžké“ / „špatné“) → váhu držet.
 * Je to jen návrh, uživatel ho použije klepnutím.
 */
export interface ExerciseSuggestion {
  kind: 'up' | 'hold';
  deltaKg: number;
  /** z jakého tréninku návrh vychází */
  date: string;
  rpe: number | null;
  lastKg: number;
}

export const UP_KG = 2.5;
export const DOWN_PCT = 5;

export function exerciseSuggestion(data: TrainingData, ex: LoggedExercise, today: string): ExerciseSuggestion | null {
  const last = data.logs
    .filter((l) => l.date < today && bestKg(l, ex.exerciseId) > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0];
  if (!last) return null;
  const lastKg = bestKg(last, ex.exerciseId);
  const rpe = last.rpe ?? null;
  const easy = last.feeling === 'easy' || (rpe !== null && rpe <= 7);
  const hard = last.feeling === 'hard' || last.feeling === 'bad' || (rpe !== null && rpe >= 9.5);
  const planned = Math.max(0, ...ex.sets.filter((s) => !s.done).map((s) => s.kg));
  if (hard) return { kind: 'hold', deltaKg: 0, date: last.date, rpe, lastKg };
  // plán už sám přidal (např. týdenní progrese) → nic nenavrhujeme
  if (easy && planned > 0 && planned <= lastKg) return { kind: 'up', deltaKg: UP_KG, date: last.date, rpe, lastKg };
  return null;
}

/** Dnešní připravenost, pokud je nízká (jinak null). */
export function lowReadiness(data: TrainingData, today: string) {
  const w = wellnessFor(data, today);
  if (!w) return null;
  const score = readiness(w);
  return readinessLevel(score) === 'low' ? score : null;
}

/** Upraví váhu všech ještě neodškrtnutých nástupů se zátěží. */
export function adjustUndone(ex: LoggedExercise, fn: (kg: number) => number): LoggedExercise {
  return { ...ex, sets: ex.sets.map((s) => (s.done || s.kg <= 0 ? s : { ...s, kg: Math.max(0, fn(s.kg)) })) };
}

export const lighter = (kg: number) => roundTo(kg * (1 - DOWN_PCT / 100), 0.5);
export const heavier = (kg: number) => kg + UP_KG;
