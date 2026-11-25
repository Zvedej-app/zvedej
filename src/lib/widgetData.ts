import { exerciseName } from '../data/exercises';
import { addDays, parseISODate, startOfWeek, toISODate } from './date';
import { plural, type Lang, type TKey } from './i18n';
import { activePlan, dayForDate, dayLabel, weekStreak } from './training';
import type { TrainingData } from './types';
import type { TodayWidgetProps } from '../widgets/TodayWidget';

/** Data pro widget na ploše pro daný den (dnešek, nebo zítřek pro půlnoční přepnutí). */
export function widgetProps(data: TrainingData, lang: Lang, t: (k: TKey) => string, date = new Date()): TodayWidgetProps {
  const iso = toISODate(date);
  const plan = activePlan(data, iso);
  const day = plan ? dayForDate(plan, date) : null;
  const wdName = (w: number) => t(`tr.weekdayFull.${w}` as TKey);
  const doneToday = data.logs.some((l) => l.date === iso);
  const title = day ? dayLabel(day, wdName) : doneToday ? t('widget.done') : plan ? t('widget.rest') : t('widget.noPlan');
  const detail = day
    ? day.exercises
        .slice(0, 4)
        .map((e) => exerciseName(e.exerciseId, lang, data.customExercises, e.customName))
        .join(' · ')
    : '';
  const monday = startOfWeek(date);
  const logged = new Set(data.logs.map((l) => l.date));
  const days = Array.from({ length: 7 }, (_, i) => (logged.has(toISODate(addDays(monday, i))) ? '1' : '0')).join('');
  const streak = weekStreak(data, parseISODate(iso));
  return {
    title,
    detail: doneToday && day ? `✓ ${t('widget.done')}` : detail,
    streak,
    streakLabel: streak > 0 ? `${plural(lang, 'week', streak).replace(/^\d+ /, '')} ${t('cel.inRow')}` : t('tr.streakStart'),
    days,
    dayNames: Array.from({ length: 7 }, (_, i) => t(`tr.weekday.${i}` as TKey)).join(','),
    weekLabel: t('log.thisWeek'),
  };
}
