import { getExercise, MAX_LIFTS } from '../data/exercises';
import { addDays, parseISODate, startOfWeek, toISODate, todayISO, weekNumberSince, weekdayMon0 } from './date';
import { uid } from './id';
import type { AssignedPlan, LoadSpec, LoggedExercise, PlanDay, SetScheme, TrainingData, TrainingPlan, WorkoutLog } from './types';
import { roundTo } from './units';

export const EMPTY_TRAINING: TrainingData = {
  version: 1,
  plans: [],
  logs: [],
  maxes: {},
  customExercises: [],
  updatedAt: new Date(0).toISOString(),
};

export function activePlan(data: TrainingData, date = todayISO()) {
  const candidates = data.plans
    .filter((p) => p.status === 'active' && p.startDate <= date && (!p.endDate || p.endDate >= date))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  return candidates[0] ?? null;
}

/** Plán, který začne v budoucnu (např. „od příštího týdne“). */
export function upcomingPlan(data: TrainingData, date = todayISO()) {
  return (
    data.plans
      .filter((p) => p.status === 'active' && p.startDate > date)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null
  );
}

export function planWeek(plan: TrainingPlan, date = new Date()) {
  return weekNumberSince(plan.startDate, date);
}

export function dayForDate(plan: TrainingPlan, date = new Date()): PlanDay | null {
  const wd = weekdayMon0(date);
  return plan.days.find((d) => d.weekdays.includes(wd)) ?? null;
}

/** Další tréninkový den v týdnu (pro „volno“ dny). */
export function nextDay(plan: TrainingPlan, date = new Date()) {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(date, i);
    const day = dayForDate(plan, d);
    if (day) return { day, date: d };
  }
  return null;
}

export function effectivePercent(load: LoadSpec, plan: TrainingPlan | null, week: number) {
  if (load.type !== 'percent') return null;
  const inc = plan?.weeklyIncrementPct ?? 0;
  return load.value + inc * Math.max(0, week - 1);
}

export function schemeKg(
  scheme: SetScheme,
  maxes: Record<string, number>,
  plan: TrainingPlan | null,
  week: number,
  roundingKg: number,
): number | null {
  const l = scheme.load;
  if (l.type === 'kg') return l.value;
  if (l.type === 'percent') {
    const max = maxes[l.of];
    if (!max) return null;
    const pct = effectivePercent(l, plan, week) ?? l.value;
    return roundTo((max * pct) / 100, roundingKg);
  }
  return null;
}

export function defaultPctOf(exerciseId: string) {
  return getExercise(exerciseId)?.pctOf ?? exerciseId;
}

export function workoutFromDay(
  day: PlanDay,
  plan: TrainingPlan,
  data: TrainingData,
  roundingKg: number,
  date = new Date(),
): LoggedExercise[] {
  const week = planWeek(plan, date);
  return day.exercises.map((pe) => ({
    id: uid('le'),
    exerciseId: pe.exerciseId,
    customName: pe.customName,
    note: pe.note,
    sets: pe.schemes.flatMap((s) => {
      const kg = schemeKg(s, data.maxes, plan, week, roundingKg) ?? lastWeightFor(data, pe.exerciseId, s.reps) ?? 0;
      return Array.from({ length: s.sets }, () => ({ reps: s.reps, kg, done: false }));
    }),
  }));
}

/** Poslední použitá váha u cviku (pro předvyplnění). */
export function lastWeightFor(data: TrainingData, exerciseId: string, reps?: number) {
  const logs = [...data.logs].sort((a, b) => b.date.localeCompare(a.date));
  for (const l of logs) {
    const ex = l.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const sets = ex.sets.filter((s) => s.done && (!reps || s.reps === reps));
    if (sets.length) return Math.max(...sets.map((s) => s.kg));
  }
  return null;
}

export function logTonnage(log: WorkoutLog) {
  return log.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + (s.done ? s.reps * s.kg : 0), 0), 0);
}

export function logSetCount(log: WorkoutLog) {
  return log.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
}

export function weekStats(data: TrainingData, ref = new Date()) {
  const from = toISODate(startOfWeek(ref));
  const to = toISODate(addDays(startOfWeek(ref), 6));
  const logs = data.logs.filter((l) => l.date >= from && l.date <= to);
  return { count: logs.length, tonnage: logs.reduce((a, l) => a + logTonnage(l), 0) };
}

/** Počet po sobě jdoucích týdnů s alespoň jedním tréninkem. */
export function weekStreak(data: TrainingData, ref = new Date()) {
  const weeks = new Set(data.logs.map((l) => toISODate(startOfWeek(parseISODate(l.date)))));
  let n = 0;
  let w = startOfWeek(ref);
  if (!weeks.has(toISODate(w))) w = addDays(w, -7); // aktuální týden ještě může přijít
  while (weeks.has(toISODate(w))) {
    n++;
    w = addDays(w, -7);
  }
  return n;
}

export function exerciseHistory(data: TrainingData, exerciseId: string) {
  return data.logs
    .filter((l) => l.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((l) => {
      const e = l.exercises.find((x) => x.exerciseId === exerciseId)!;
      const done = e.sets.filter((s) => s.done);
      return { date: l.date, top: done.length ? Math.max(...done.map((s) => s.kg)) : 0, sets: done };
    });
}

export function describeLoad(load: LoadSpec, opts: { pct?: number | null; kgText?: string | null }) {
  if (load.type === 'percent') return `${opts.pct ?? load.value} %${opts.kgText ? ` · ${opts.kgText}` : ''}`;
  if (load.type === 'kg') return opts.kgText ?? `${load.value} kg`;
  if (load.type === 'rpe') return `RPE ${load.value}`;
  return '';
}

export function clonePlan(p: TrainingPlan, patch: Partial<TrainingPlan>): TrainingPlan {
  const now = new Date().toISOString();
  return {
    ...p,
    id: uid('pl'),
    days: p.days.map((d) => ({
      ...d,
      id: uid('pd'),
      exercises: d.exercises.map((e) => ({ ...e, id: uid('pe'), schemes: e.schemes.map((s) => ({ ...s, id: uid('ss') })) })),
    })),
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

export function mergeTraining(local: TrainingData, remote: TrainingData | null): TrainingData {
  if (!remote) return local;
  // Sloučení po záznamech (tréninky a plány se z offline zařízení neztratí):
  // tréninky a plány se spojí podle id, smazané zůstanou smazané, ostatní z novější verze.
  const newer = (remote.updatedAt ?? '') > (local.updatedAt ?? '') ? remote : local;
  const older = newer === remote ? local : remote;
  const deleted = Array.from(new Set([...(local.deleted ?? []), ...(remote.deleted ?? [])])).slice(-2000);
  const gone = new Set(deleted);
  const byId = <T extends { id: string }>(a: T[], b: T[], pick: (x: T, y: T) => T) => {
    const m = new Map<string, T>();
    for (const x of a) if (!gone.has(x.id)) m.set(x.id, x);
    for (const y of b) {
      if (gone.has(y.id)) continue;
      const x = m.get(y.id);
      m.set(y.id, x ? pick(x, y) : y);
    }
    return [...m.values()];
  };
  const logs = byId(older.logs ?? [], newer.logs ?? [], (_o, n) => n);
  const plans = byId(older.plans ?? [], newer.plans ?? [], (o, n) => ((o.updatedAt ?? '') > (n.updatedAt ?? '') ? o : n));
  const customExercises = byId(older.customExercises ?? [], newer.customExercises ?? [], (_o, n) => n);
  const hist = new Map<string, { exerciseId: string; kg: number; date: string }>();
  for (const h of [...(older.maxHistory ?? []), ...(newer.maxHistory ?? [])]) hist.set(`${h.exerciseId}:${h.date}`, h);
  // deník regenerace: jeden záznam na den, platí ten později upravený
  const well = new Map<string, NonNullable<TrainingData['wellness']>[number]>();
  for (const w of [...(older.wellness ?? []), ...(newer.wellness ?? [])]) {
    const cur = well.get(w.date);
    if (!cur || (w.updatedAt ?? '') >= (cur.updatedAt ?? '')) well.set(w.date, w);
  }
  // odvolaný souhlas (v novější verzi) maže i záznamy
  const wellness = newer.wellnessConsentAt === null ? [] : [...well.values()];
  return {
    ...newer,
    logs,
    plans,
    customExercises,
    wellness,
    maxHistory: [...hist.values()],
    deleted,
    updatedAt: newer.updatedAt,
  };
}

/** Jsou data stejná (pro rozhodnutí, zda ukládat / odesílat)? */
export function sameTraining(a: TrainingData, b: TrainingData) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Název tréninkového dne. U automaticky pojmenovaných dnů se řídí dnem v týdnu, ve kterém trénink otevíráš. */
export function dayLabel(day: PlanDay, weekdayName: (w: number) => string, refWeekday?: number) {
  if (!day.nameAuto || day.weekdays.length === 0) return day.name;
  const w = refWeekday !== undefined && day.weekdays.includes(refWeekday) ? refWeekday : day.weekdays[0];
  return weekdayName(w);
}

/** Cviky v sekci „Moje maxima“: základní + přidané uživatelem + všechny, které mají zadanou hodnotu. */
export function maxLiftIds(data: TrainingData) {
  return Array.from(new Set([...MAX_LIFTS, ...(data.maxLifts ?? []), ...Object.keys(data.maxes)]));
}

/**
 * Promítne plány od trenéra do tréninkových dat svěřence.
 * Nový plán se přidá jako aktivní, změněný se přepíše (stav a konec ponechá svěřenec),
 * plán, který trenér odebral, se archivuje. Bez změny vrací stejný objekt.
 */
export function mergeAssignedPlans(data: TrainingData, assigned: AssignedPlan[]): TrainingData {
  let changed = false;
  const today = todayISO();
  const ids = new Set(assigned.map((a) => `coach-${a.id}`));
  const plans = data.plans.map((p) => {
    if (p.fromCoach && !ids.has(p.id) && p.status === 'active') {
      changed = true;
      return { ...p, status: 'archived' as const, endDate: p.endDate && p.endDate < today ? p.endDate : today };
    }
    return p;
  });
  for (const a of assigned) {
    const id = `coach-${a.id}`;
    const i = plans.findIndex((p) => p.id === id);
    const existing = i >= 0 ? plans[i] : null;
    if (existing && existing.updatedAt === a.updatedAt) continue;
    changed = true;
    const next: TrainingPlan = {
      ...a.plan,
      id,
      status: existing ? existing.status : 'active',
      endDate: existing ? existing.endDate : a.plan.endDate && a.plan.endDate >= today ? a.plan.endDate : null,
      fromCoach: { coachId: a.coachId, coachName: a.coachName, assignmentId: a.id },
      updatedAt: a.updatedAt,
      createdAt: existing?.createdAt ?? a.updatedAt,
    };
    if (existing) plans[i] = next;
    else plans.push(next);
  }
  return changed ? { ...data, plans } : data;
}
