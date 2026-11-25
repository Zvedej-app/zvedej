import { describe, expect, test } from '@jest/globals';
import { mergeAssignedPlans, mergeTraining, weekStreak } from '../src/lib/training';
import type { AssignedPlan, TrainingData, WorkoutLog } from '../src/lib/types';

const base: TrainingData = { version: 1, plans: [], logs: [], maxes: {}, customExercises: [], updatedAt: '' };
const log = (id: string, date = '2026-11-20'): WorkoutLog => ({ id, date, planId: null, dayId: null, title: id, exercises: [], createdAt: '' });

describe('Synchronizace mezi zařízeními (offline)', () => {
  const phone = { ...base, logs: [log('l2'), log('l3')], deleted: ['l1'], updatedAt: '2026-11-24T10:00:00Z' };
  const server = { ...base, logs: [log('l1'), log('l2'), log('l4')], maxes: { snatch: 90 }, updatedAt: '2026-11-24T09:00:00Z' };
  test('tréninky z obou zařízení se spojí, smazaný se nevrátí', () => {
    expect(mergeTraining(phone, server).logs.map((l) => l.id).sort()).toEqual(['l2', 'l3', 'l4']);
  });
  test('nezáleží na pořadí', () => {
    expect(mergeTraining(server, phone).logs.map((l) => l.id).sort()).toEqual(['l2', 'l3', 'l4']);
  });
  test('regenerace: platí později upravený záznam dne', () => {
    const w = (sleep: number, updatedAt: string) => ({ date: '2026-11-24', sleepHours: 7, sleep, energy: 3, soreness: 3, mood: 3, updatedAt });
    const a = { ...base, wellness: [w(2, '2026-11-24T08:00:00Z')], wellnessConsentAt: 'x', updatedAt: '2' };
    const b = { ...base, wellness: [w(5, '2026-11-24T09:00:00Z')], wellnessConsentAt: 'x', updatedAt: '1' };
    expect(mergeTraining(a, b).wellness?.[0].sleep).toBe(5);
  });
  test('odvolaný souhlas maže záznamy regenerace', () => {
    const w = { date: '2026-11-24', sleepHours: 7, sleep: 3, energy: 3, soreness: 3, mood: 3, updatedAt: '' };
    const revoked = { ...base, wellness: [], wellnessConsentAt: null, updatedAt: '3' };
    const old = { ...base, wellness: [w], wellnessConsentAt: 'x', updatedAt: '1' };
    expect(mergeTraining(revoked, old).wellness).toEqual([]);
  });
});

describe('Plány od trenéra', () => {
  const assigned: AssignedPlan = {
    id: 'a1',
    coachId: 'c',
    coachName: 'Trenér',
    athleteId: 'me',
    sourcePlanId: 'p1',
    plan: { id: 'p1', name: 'Blok', startDate: '2026-11-23', endDate: null, status: 'draft', days: [], createdAt: '', updatedAt: '' },
    updatedAt: 'u1',
    seenAt: null,
  };
  test('nový plán se přidá jako aktivní a označí trenérem', () => {
    const d = mergeAssignedPlans(base, [assigned]);
    expect(d.plans[0]).toMatchObject({ id: 'coach-a1', status: 'active', fromCoach: { coachName: 'Trenér' } });
  });
  test('beze změny vrací stejný objekt', () => {
    const d = mergeAssignedPlans(base, [assigned]);
    expect(mergeAssignedPlans(d, [assigned])).toBe(d);
  });
  test('odebraný plán se archivuje', () => {
    const d = mergeAssignedPlans(base, [assigned]);
    expect(mergeAssignedPlans(d, []).plans[0].status).toBe('archived');
  });
});

describe('Série týdnů', () => {
  test('počítá souvislé týdny', () => {
    const d = { ...base, logs: [log('a', '2026-11-24'), log('b', '2026-11-17'), log('c', '2026-11-10'), log('d', '2026-10-27')] };
    expect(weekStreak(d, new Date(2026, 10, 25))).toBe(3);
  });
});
