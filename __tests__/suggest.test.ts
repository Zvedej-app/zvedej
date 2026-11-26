import { describe, expect, test } from '@jest/globals';
import { adjustUndone, exerciseSuggestion, lighter, lowReadiness } from '../src/lib/suggest';
import type { LoggedExercise, TrainingData, WorkoutLog } from '../src/lib/types';

const log = (date: string, kg: number, over: Partial<WorkoutLog> = {}): WorkoutLog => ({
  id: date,
  date,
  planId: null,
  dayId: null,
  title: '',
  createdAt: `${date}T10:00:00Z`,
  exercises: [{ id: 'x', exerciseId: 'snatch', sets: [{ reps: 2, kg, done: true }] }],
  ...over,
});
const data = (logs: WorkoutLog[], over: Partial<TrainingData> = {}): TrainingData => ({
  version: 1,
  plans: [],
  logs,
  maxes: {},
  customExercises: [],
  updatedAt: '',
  ...over,
});
const today: LoggedExercise = { id: 't', exerciseId: 'snatch', sets: [{ reps: 2, kg: 80, done: false }, { reps: 2, kg: 80, done: true }] };

describe('návrh vah podle formy', () => {
  test('minule lehce (RPE 6) a plán nepřidal → +2,5 kg', () => {
    const s = exerciseSuggestion(data([log('2026-11-20', 80, { rpe: 6 })]), today, '2026-11-25');
    expect(s).toMatchObject({ kind: 'up', deltaKg: 2.5, lastKg: 80 });
  });
  test('plán už přidal sám → nic', () => {
    expect(exerciseSuggestion(data([log('2026-11-20', 75, { rpe: 6 })]), today, '2026-11-25')).toBeNull();
  });
  test('minule těžké → držet', () => {
    expect(exerciseSuggestion(data([log('2026-11-20', 80, { feeling: 'hard' })]), today, '2026-11-25')?.kind).toBe('hold');
  });
  test('bez historie nebo průměrný trénink → nic', () => {
    expect(exerciseSuggestion(data([]), today, '2026-11-25')).toBeNull();
    expect(exerciseSuggestion(data([log('2026-11-20', 80, { rpe: 8 })]), today, '2026-11-25')).toBeNull();
  });
  test('nízká připravenost a ubrání 5 % jen u neodškrtnutých nástupů', () => {
    const d = data([], {
      wellness: [{ date: '2026-11-25', sleepHours: 5, sleep: 1, energy: 2, soreness: 2, mood: 2, updatedAt: '' }],
    });
    expect(lowReadiness(d, '2026-11-25')).not.toBeNull();
    expect(lowReadiness(d, '2026-11-24')).toBeNull();
    expect(adjustUndone(today, lighter).sets.map((s) => s.kg)).toEqual([76, 80]);
  });
});
