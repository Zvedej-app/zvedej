import { describe, expect, test } from '@jest/globals';
import { logRecords } from '../src/lib/training';
import type { TrainingData, WorkoutLog } from '../src/lib/types';

const log = (id: string, date: string, kg: number, ex = 'snatch'): WorkoutLog => ({
  id,
  date,
  planId: null,
  dayId: null,
  title: 'T',
  createdAt: `${date}T10:00:00.000Z`,
  exercises: [{ id: `e${id}`, exerciseId: ex, sets: [{ reps: 1, kg, done: true }, { reps: 1, kg: kg + 20, done: false }] }],
});
const data = (logs: WorkoutLog[], maxes: Record<string, number> = {}): TrainingData => ({
  version: 1,
  plans: [],
  logs,
  maxes,
  customExercises: [],
  updatedAt: '2026-11-01T00:00:00.000Z',
});

describe('osobní rekordy v tréninku', () => {
  test('těžší než všechny předchozí tréninky i zadané maximum', () => {
    const now = log('c', '2026-11-20', 95);
    const d = data([log('a', '2026-11-01', 85), log('b', '2026-11-10', 88), now], { snatch: 90 });
    expect(logRecords(d, now)).toEqual([{ exerciseId: 'snatch', customName: undefined, kg: 95, prev: 90 }]);
  });
  test('neodtrénované nástupy se nepočítají, pozdější tréninky taky ne', () => {
    const now = log('b', '2026-11-10', 88);
    const d = data([log('a', '2026-11-01', 90), now, log('c', '2026-11-20', 100)]);
    expect(logRecords(d, now)).toEqual([]);
  });
  test('cvik bez historie není rekord', () => {
    const now = log('a', '2026-11-01', 120, 'back_squat');
    expect(logRecords(data([now]), now)).toEqual([]);
  });
});
