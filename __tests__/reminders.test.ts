import { describe, expect, test } from '@jest/globals';
import { competitionReminders, trainingReminders } from '../src/lib/reminders';
import type { FeedItem, TrainingData, TrainingPlan, WorkoutLog } from '../src/lib/types';

// středa 25. 11. 2026, 9:00 místního času
const NOW = new Date(2026, 10, 25, 9, 0, 0);
const opts = {
  time: '17:30',
  now: NOW,
  days: 8,
  weekdayName: (w: number) => ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'][w],
  exerciseName: (id: string) => id,
  texts: { planned: 'Dnes: {day}', habit: 'Čas na trénink', habitBody: 'x' },
};
const plan: TrainingPlan = {
  id: 'p',
  name: 'Blok',
  startDate: '2026-11-01',
  endDate: null,
  status: 'active',
  days: [
    { id: 'd1', name: 'A', weekdays: [2], nameAuto: true, exercises: [{ id: 'e', exerciseId: 'snatch', schemes: [] }] },
    { id: 'd2', name: 'B', weekdays: [4], exercises: [] },
  ],
  createdAt: '',
  updatedAt: '',
};
const empty = (over: Partial<TrainingData>): TrainingData => ({
  version: 1,
  plans: [],
  logs: [],
  maxes: {},
  customExercises: [],
  updatedAt: '',
  ...over,
});
const log = (date: string): WorkoutLog => ({ id: date, date, planId: null, dayId: null, title: '', exercises: [], createdAt: '' });

describe('připomínky tréninku', () => {
  test('v plánované dny v nastavený čas, s názvem dne a cviky', () => {
    const r = trainingReminders(empty({ plans: [plan] }), opts);
    expect(r.map((x) => x.id)).toEqual(['t-2026-11-25', 't-2026-11-27', 't-2026-12-02']);
    expect(r[0].title).toBe('Dnes: St');
    expect(r[0].body).toBe('snatch');
    expect(r[0].at.getHours()).toBe(17);
    expect(r[0].at.getMinutes()).toBe(30);
  });
  test('den s už zapsaným tréninkem se přeskočí', () => {
    const r = trainingReminders(empty({ plans: [plan], logs: [log('2026-11-25')] }), opts);
    expect(r[0].id).toBe('t-2026-11-27');
  });
  test('bez plánu podle zvyku (den v týdnu aspoň 2× za 4 týdny)', () => {
    const logs = ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-04'].map(log); // pondělky 3×, středa 1×
    const r = trainingReminders(empty({ logs }), opts);
    expect(r.map((x) => x.id)).toEqual(['t-2026-11-30']);
    expect(r[0].title).toBe('Čas na trénink');
  });
  test('čas, který už dnes proběhl, se nenaplánuje', () => {
    const r = trainingReminders(empty({ plans: [plan] }), { ...opts, time: '08:00' });
    expect(r[0].id).toBe('t-2026-11-27');
  });
});

describe('připomínky závodů klubu', () => {
  const feed: FeedItem[] = [
    { id: 'a', title: 'MVC Holešova', link: '', date: '2026-11-28', place: 'TJ Holešov' },
    { id: 'b', title: 'Finále ligy', link: '', date: '2026-11-28', place: 'TAK Hellas Brno' },
    { id: 'c', title: 'Velká cena', link: '', date: '2027-02-01', place: 'TJ Holešov' },
  ];
  test('jen závody klubu v příštích 30 dnech, 2 dny předem v 18:00', () => {
    const r = competitionReminders(feed, 'TJ Holešov', { now: NOW, title: 'Závod: {title}' });
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe('Závod: MVC Holešova');
    expect(r[0].at).toEqual(new Date(2026, 10, 26, 18, 0, 0));
  });
});
