import { describe, expect, test } from '@jest/globals';
import { logRecords, mergeTraining, routineExercises, workoutFromDay } from '../src/lib/training';
import type { Routine, TrainingData, TrainingPlan, WorkoutLog } from '../src/lib/types';

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

describe('rozcvičky a doplňky', () => {
  const acc: Routine = {
    id: 'r1',
    kind: 'accessory',
    name: 'Záda',
    updatedAt: '2026-11-01T00:00:00Z',
    items: [
      { id: 'i1', exerciseId: 'back_ext', sets: 3, reps: 12 },
      { id: 'i2', text: 'Lýtka', sets: 2, reps: 15, kg: 20 },
    ],
  };
  test('doplňky se převedou na cviky tréninku', () => {
    const ex = routineExercises(acc);
    expect(ex.map((e) => [e.exerciseId, e.customName, e.sets.length, e.sets[0].reps, e.sets[0].kg])).toEqual([
      ['back_ext', undefined, 3, 12, 0],
      ['other', 'Lýtka', 2, 15, 20],
    ]);
  });
  test('den plánu s doplňky je přidá na konec tréninku', () => {
    const plan: TrainingPlan = {
      id: 'p',
      name: 'P',
      startDate: '2026-11-01',
      endDate: null,
      status: 'active',
      days: [{ id: 'd', name: 'A', weekdays: [0], exercises: [{ id: 'e', exerciseId: 'snatch', schemes: [] }], accessories: acc }],
      createdAt: '',
      updatedAt: '',
    };
    const ex = workoutFromDay(plan.days[0], plan, data([]), 2.5, new Date(2026, 10, 2));
    expect(ex.map((e) => e.exerciseId)).toEqual(['snatch', 'back_ext', 'other']);
  });
  test('synchronizace: novější úprava rozcvičky vyhraje, smazaná zůstane smazaná', () => {
    const a = { ...data([]), routines: [acc, { ...acc, id: 'r2', name: 'Pryč' }], updatedAt: '2026-11-02T00:00:00Z' };
    const b = {
      ...data([]),
      routines: [{ ...acc, name: 'Záda 2', updatedAt: '2026-11-03T00:00:00Z' }],
      deleted: ['r2'],
      updatedAt: '2026-11-01T00:00:00Z',
    };
    const m = mergeTraining(a, b);
    expect(m.routines?.map((r) => r.name)).toEqual(['Záda 2']);
  });
});
