import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { addDays, nextMonday, startOfWeek, toISODate, todayISO } from '../lib/date';
import { uid } from '../lib/id';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';
import { clonePlan, EMPTY_TRAINING, mergeAssignedPlans, mergeTraining, sameTraining } from '../lib/training';
import type { LoggedExercise, Routine, RoutineItem, TrainingData, TrainingPlan, WellnessEntry, WorkoutLog } from '../lib/types';
import { useAuth } from './AuthProvider';

/**
 * Tréninky jsou „local-first“: ukládají se okamžitě do zařízení (fungují offline
 * v posilovně bez signálu) a na pozadí se synchronizují na server.
 */

export interface ActiveWorkout {
  id: string;
  startedAt: string;
  date: string;
  planId: string | null;
  dayId: string | null;
  title: string;
  exercises: LoggedExercise[];
  /** rozcvička k odškrtání (nepočítá se do nástupů ani tonáže) */
  warmup?: { name: string; items: RoutineItem[]; done: string[] } | null;
}

interface Ctx {
  data: TrainingData;
  /** 'pending' = změny čekají v telefonu na odeslání (bez signálu) */
  syncState: 'synced' | 'pending';
  ready: boolean;
  active: ActiveWorkout | null;
  savePlan: (p: TrainingPlan) => void;
  deletePlan: (id: string) => void;
  activatePlan: (id: string) => void;
  archivePlan: (id: string) => void;
  /** Zkopíruje plán a nový aktivuje od příštího pondělí; vrací id nového plánu */
  changeFromNextWeek: (id: string) => string;
  duplicatePlan: (id: string) => string;
  setMax: (exerciseId: string, kg: number | null) => void;
  /** přidá cvik do sekce Moje maxima */
  addMaxLift: (exerciseId: string) => void;
  /** odebere přidaný cvik z maxim (včetně zadané hodnoty) */
  removeMaxLift: (exerciseId: string) => void;
  addCustomExercise: (name: string) => string;
  startWorkout: (w: Omit<ActiveWorkout, 'id' | 'startedAt'>) => void;
  updateActive: (fn: (w: ActiveWorkout) => ActiveWorkout) => void;
  finishWorkout: (extra: Pick<WorkoutLog, 'notes' | 'rpe' | 'bodyweight' | 'feeling'>) => WorkoutLog | null;
  discardWorkout: () => void;
  saveLog: (log: WorkoutLog) => void;
  deleteLog: (id: string) => void;
  /** stáhne plány od trenéra a promítne je do dat */
  syncCoachPlans: () => Promise<void>;
  /** deník regenerace */
  saveWellness: (e: WellnessEntry) => void;
  /** souhlas se zpracováním údajů o zdraví; odvolání smaže všechny záznamy */
  setWellnessConsent: (on: boolean) => void;
  setWellnessShareCoach: (on: boolean) => void;
  /** rozcvičky a doplňky */
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
}

const TrainingContext = createContext<Ctx | null>(null);

const dataKey = (u: string) => `zvedej:training:${u}`;
const activeKey = (u: string) => `zvedej:training:active:${u}`;
const pendingKey = (u: string) => `zvedej:training:pending:${u}`;

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.userId ?? 'anon';
  const [data, setData] = useState<TrainingData>(EMPTY_TRAINING);
  const [active, setActive] = useState<ActiveWorkout | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const ready = loadedFor === userId;
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncRef = useRef<(() => Promise<void>) | null>(null);
  const dataRef = useRef<TrainingData>(EMPTY_TRAINING);
  const flushing = useRef(false);
  const flushRef = useRef<(() => Promise<void>) | null>(null);
  // 'synced' = vše na serveru, 'pending' = změny čekají v telefonu na odeslání (např. bez signálu)
  const [syncState, setSyncState] = useState<'synced' | 'pending'>('synced');
  const canSync = api.mode === 'supabase' && userId !== 'anon';

  /** Odešle neodeslané změny; při chybě (bez signálu) to zkusí znovu za 30 s a hned po připojení. */
  const flush = useCallback(async () => {
    if (!canSync || flushing.current) return;
    const pending = await AsyncStorage.getItem(pendingKey(userId)).catch(() => null);
    if (!pending) {
      setSyncState('synced');
      return;
    }
    flushing.current = true;
    try {
      const sent = dataRef.current;
      await api.saveTraining(userId, sent);
      // mezitím mohla přibýt další změna – příznak smažeme jen když se nic nezměnilo
      if (dataRef.current === sent) {
        await AsyncStorage.removeItem(pendingKey(userId)).catch(() => {});
        setSyncState('synced');
      } else {
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => flushRef.current?.(), 1500);
      }
    } catch {
      setSyncState('pending');
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => flushRef.current?.(), 30000);
    } finally {
      flushing.current = false;
    }
  }, [canSync, userId]);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    let alive = true;
    (async () => {
      let local = EMPTY_TRAINING;
      try {
        const raw = await AsyncStorage.getItem(dataKey(userId));
        if (raw) local = { ...EMPTY_TRAINING, ...JSON.parse(raw) };
        const a = await AsyncStorage.getItem(activeKey(userId));
        if (alive) setActive(a ? JSON.parse(a) : null);
      } catch {}
      if (alive) {
        dataRef.current = local;
        setData(local);
        setLoadedFor(userId);
      }
      if (api.mode === 'supabase' && userId !== 'anon') {
        try {
          const remote = await api.loadTraining(userId);
          const merged = mergeTraining(local, remote);
          if (alive && !sameTraining(merged, local)) {
            local = merged;
            dataRef.current = merged;
            setData(merged);
            AsyncStorage.setItem(dataKey(userId), JSON.stringify(merged)).catch(() => {});
          }
          // v telefonu je něco, co server nemá (zapsáno bez signálu) → odeslat
          if (!remote || !sameTraining(merged, remote)) await AsyncStorage.setItem(pendingKey(userId), '1').catch(() => {});
        } catch {}
        if (alive) flushRef.current?.();
      }
      if (alive && userId !== 'anon') syncRef.current?.();
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  // po obnovení připojení nebo návratu do aplikace hned odešli, co čeká
  useEffect(() => {
    if (!canSync) return;
    const sub = Network.addNetworkStateListener((e) => {
      if (e.isConnected) flushRef.current?.();
    });
    const app = AppState.addEventListener('change', (st) => {
      if (st === 'active') flushRef.current?.();
    });
    const online = () => flushRef.current?.();
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('online', online);
    return () => {
      sub.remove();
      app.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('online', online);
    };
  }, [canSync]);

  const persist = useCallback(
    (next: TrainingData) => {
      dataRef.current = next;
      AsyncStorage.setItem(dataKey(userId), JSON.stringify(next)).catch(() => {});
      if (canSync) {
        AsyncStorage.setItem(pendingKey(userId), '1').catch(() => {});
        setSyncState('pending');
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => flushRef.current?.(), 1500);
      }
    },
    [userId, canSync],
  );

  const mutate = useCallback(
    (fn: (d: TrainingData) => TrainingData) => {
      setData((d) => {
        const next = { ...fn(d), updatedAt: new Date().toISOString() };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const setActivePersist = useCallback(
    (w: ActiveWorkout | null) => {
      setActive(w);
      if (w) AsyncStorage.setItem(activeKey(userId), JSON.stringify(w)).catch(() => {});
      else AsyncStorage.removeItem(activeKey(userId)).catch(() => {});
    },
    [userId],
  );

  const value = useMemo<Ctx>(() => {
    const replacePlan = (d: TrainingData, p: TrainingPlan) => ({
      ...d,
      plans: d.plans.some((x) => x.id === p.id) ? d.plans.map((x) => (x.id === p.id ? p : x)) : [...d.plans, p],
    });
    return {
      data,
      syncState,
      ready,
      active,
      savePlan: (p) => mutate((d) => replacePlan(d, { ...p, updatedAt: new Date().toISOString() })),
      deletePlan: (id) =>
        mutate((d) => ({ ...d, plans: d.plans.filter((p) => p.id !== id), deleted: [...(d.deleted ?? []), id] })),
      activatePlan: (id) =>
        mutate((d) => {
          const today = todayISO();
          const yesterday = toISODate(addDays(new Date(), -1));
          return {
            ...d,
            plans: d.plans.map((p) => {
              if (p.id === id)
                return { ...p, status: 'active', startDate: p.startDate > today ? p.startDate : today, endDate: null };
              if (p.status === 'active' && p.startDate <= today)
                return { ...p, status: 'archived', endDate: p.startDate <= yesterday ? yesterday : p.startDate };
              return p;
            }),
          };
        }),
      archivePlan: (id) =>
        mutate((d) => ({
          ...d,
          plans: d.plans.map((p) => (p.id === id ? { ...p, status: 'archived', endDate: p.endDate ?? todayISO() } : p)),
        })),
      changeFromNextWeek: (id) => {
        const src = data.plans.find((p) => p.id === id);
        if (!src) return id;
        const start = nextMonday();
        const endOld = toISODate(addDays(start, -1));
        const copy = clonePlan(src, { status: 'active', startDate: toISODate(start), endDate: null });
        mutate((d) => ({
          ...d,
          plans: [...d.plans.map((p) => (p.id === id ? { ...p, endDate: endOld } : p)), copy],
        }));
        return copy.id;
      },
      duplicatePlan: (id) => {
        const src = data.plans.find((p) => p.id === id);
        if (!src) return id;
        const copy = clonePlan(src, {
          status: 'draft',
          name: `${src.name} (2)`,
          startDate: toISODate(startOfWeek(new Date())),
          endDate: null,
        });
        mutate((d) => ({ ...d, plans: [...d.plans, copy] }));
        return copy.id;
      },
      setMax: (exerciseId, kg) =>
        mutate((d) => {
          const maxes = { ...d.maxes };
          if (kg && kg > 0) maxes[exerciseId] = kg;
          else delete maxes[exerciseId];
          if (!kg || kg <= 0) return { ...d, maxes };
          // historie pro graf vývoje maxim (jeden záznam za den a cvik)
          const date = todayISO();
          const prev = d.maxHistory ?? [];
          // první zápis: pokud už maximum existovalo, zachovej ho jako výchozí bod
          const seeded =
            prev.some((h) => h.exerciseId === exerciseId) || !d.maxes[exerciseId] || d.maxes[exerciseId] === kg
              ? prev
              : [...prev, { exerciseId, kg: d.maxes[exerciseId], date: toISODate(addDays(new Date(), -1)) }];
          const maxHistory = [
            ...seeded.filter((h) => !(h.exerciseId === exerciseId && h.date === date)),
            { exerciseId, kg, date },
          ];
          return { ...d, maxes, maxHistory };
        }),
      addMaxLift: (exerciseId) => mutate((d) => ({ ...d, maxLifts: Array.from(new Set([...(d.maxLifts ?? []), exerciseId])) })),
      removeMaxLift: (exerciseId) =>
        mutate((d) => {
          const maxes = { ...d.maxes };
          delete maxes[exerciseId];
          return { ...d, maxes, maxLifts: (d.maxLifts ?? []).filter((x) => x !== exerciseId) };
        }),
      addCustomExercise: (name) => {
        const id = uid('cx');
        mutate((d) => ({ ...d, customExercises: [...d.customExercises, { id, name: name.trim() }] }));
        return id;
      },
      startWorkout: (w) => setActivePersist({ ...w, id: uid('wl'), startedAt: new Date().toISOString() }),
      updateActive: (fn) =>
        setActive((w) => {
          if (!w) return w;
          const next = fn(w);
          AsyncStorage.setItem(activeKey(userId), JSON.stringify(next)).catch(() => {});
          return next;
        }),
      finishWorkout: (extra) => {
        if (!active) return null;
        const log: WorkoutLog = {
          id: active.id,
          date: active.date,
          planId: active.planId,
          dayId: active.dayId,
          title: active.title,
          exercises: active.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) })).filter((e) => e.sets.length > 0),
          warmup: active.warmup && active.warmup.done.length > 0 ? active.warmup.name : undefined,
          durationMin: Math.max(1, Math.round((Date.now() - new Date(active.startedAt).getTime()) / 60000)),
          createdAt: new Date().toISOString(),
          ...extra,
        };
        mutate((d) => ({ ...d, logs: [...d.logs.filter((l) => l.id !== log.id), log] }));
        setActivePersist(null);
        return log;
      },
      discardWorkout: () => setActivePersist(null),
      saveRoutine: (r) =>
        mutate((d) => ({
          ...d,
          routines: [...(d.routines ?? []).filter((x) => x.id !== r.id), { ...r, updatedAt: new Date().toISOString() }],
        })),
      deleteRoutine: (id) =>
        mutate((d) => ({
          ...d,
          routines: (d.routines ?? []).filter((x) => x.id !== id),
          deleted: [...(d.deleted ?? []), id],
        })),
      saveLog: (log) => mutate((d) => ({ ...d, logs: [...d.logs.filter((l) => l.id !== log.id), log] })),
      deleteLog: (id) => mutate((d) => ({ ...d, logs: d.logs.filter((l) => l.id !== id), deleted: [...(d.deleted ?? []), id] })),
      saveWellness: (e) =>
        mutate((d) => ({
          ...d,
          wellness: [...(d.wellness ?? []).filter((w) => w.date !== e.date), { ...e, updatedAt: new Date().toISOString() }],
        })),
      setWellnessConsent: (on) =>
        mutate((d) =>
          on
            ? { ...d, wellnessConsentAt: new Date().toISOString() }
            : { ...d, wellnessConsentAt: null, wellness: [], wellnessShareCoach: false },
        ),
      setWellnessShareCoach: (on) => mutate((d) => ({ ...d, wellnessShareCoach: on })),
      syncCoachPlans: async () => {
        if (userId === 'anon') return;
        try {
          const assigned = await api.myAssignedPlans();
          setData((d) => {
            const next = mergeAssignedPlans(d, assigned);
            if (next === d) return d;
            const out = { ...next, updatedAt: new Date().toISOString() };
            persist(out);
            return out;
          });
        } catch {}
      },
    };
  }, [data, syncState, ready, active, mutate, setActivePersist, userId, persist]);

  useEffect(() => {
    syncRef.current = value.syncCoachPlans;
  }, [value]);

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}

export function useTraining() {
  const c = useContext(TrainingContext);
  if (!c) throw new Error('useTraining outside provider');
  return c;
}
