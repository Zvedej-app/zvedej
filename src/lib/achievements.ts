import type { IconName } from '../components/ui';
import { addDays, parseISODate, startOfWeek, toISODate } from './date';
import type { TKey } from './i18n';
import { logTonnage } from './training';
import type { TrainingData } from './types';

/**
 * Odznaky za milníky v tréninku. Počítají se jen z tréninkových dat v zařízení,
 * takže fungují i offline a v demo režimu. Odměňují pravidelnost a pokrok,
 * nic se neztrácí a nic netlačí (žádné „přijdeš o sérii“).
 */
export interface Achievement {
  id: string;
  icon: IconName;
  color: string;
  title: TKey;
  desc: TKey;
  /** aktuální hodnota a cíl – pro ukazatel postupu */
  progress: (s: AchievementStats) => [number, number];
}

export interface AchievementStats {
  workouts: number;
  tonnage: number;
  bestStreak: number;
  maxes: number;
  plans: number;
}

/** nejdelší série po sobě jdoucích týdnů s alespoň jedním tréninkem */
function bestWeekStreak(data: TrainingData) {
  const weeks = [...new Set(data.logs.map((l) => toISODate(startOfWeek(parseISODate(l.date)))))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const w of weeks) {
    run = prev && toISODate(addDays(parseISODate(prev), 7)) === w ? run + 1 : 1;
    best = Math.max(best, run);
    prev = w;
  }
  return best;
}

export function achievementStats(data: TrainingData): AchievementStats {
  return {
    workouts: data.logs.length,
    tonnage: data.logs.reduce((a, l) => a + logTonnage(l), 0),
    bestStreak: bestWeekStreak(data),
    maxes: Object.values(data.maxes).filter((v) => v > 0).length,
    plans: data.plans.length,
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', icon: 'flag', color: '#16A34A', title: 'ach.first', desc: 'ach.first.d', progress: (s) => [s.workouts, 1] },
  { id: 'plan', icon: 'calendar', color: '#0A3666', title: 'ach.plan', desc: 'ach.plan.d', progress: (s) => [s.plans, 1] },
  { id: 'max', icon: 'stats-chart', color: '#7C3AED', title: 'ach.max', desc: 'ach.max.d', progress: (s) => [s.maxes, 1] },
  { id: 'w10', icon: 'barbell', color: '#0A3666', title: 'ach.w10', desc: 'ach.w10.d', progress: (s) => [s.workouts, 10] },
  {
    id: 'streak4',
    icon: 'flame',
    color: '#F97316',
    title: 'ach.streak4',
    desc: 'ach.streak4.d',
    progress: (s) => [s.bestStreak, 4],
  },
  { id: 'ton10', icon: 'cube', color: '#C0000C', title: 'ach.ton10', desc: 'ach.ton10.d', progress: (s) => [s.tonnage, 10000] },
  { id: 'w50', icon: 'medal', color: '#B45309', title: 'ach.w50', desc: 'ach.w50.d', progress: (s) => [s.workouts, 50] },
  {
    id: 'streak12',
    icon: 'bonfire',
    color: '#DC2626',
    title: 'ach.streak12',
    desc: 'ach.streak12.d',
    progress: (s) => [s.bestStreak, 12],
  },
  {
    id: 'ton100',
    icon: 'rocket',
    color: '#0EA5E9',
    title: 'ach.ton100',
    desc: 'ach.ton100.d',
    progress: (s) => [s.tonnage, 100000],
  },
  { id: 'w100', icon: 'trophy', color: '#CA8A04', title: 'ach.w100', desc: 'ach.w100.d', progress: (s) => [s.workouts, 100] },
];

export function unlockedIds(data: TrainingData) {
  const s = achievementStats(data);
  return new Set(
    ACHIEVEMENTS.filter((a) => {
      const [v, goal] = a.progress(s);
      return v >= goal;
    }).map((a) => a.id),
  );
}
