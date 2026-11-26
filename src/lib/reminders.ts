import { addDays, parseISODate, toISODate, weekdayMon0 } from './date';
import { activePlan, dayForDate, dayLabel } from './training';
import type { FeedItem, TrainingData } from './types';
import type { Reminder } from './push';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function at(date: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(Number.isFinite(h) ? h : 17, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

/**
 * Připomínky tréninku na příštích `days` dní v čase `time` (HH:MM).
 * S aktivním plánem: v plánované dny s názvem dne a cviky. Bez plánu: ve dny v týdnu,
 * kdy uživatel v posledních 4 týdnech trénoval aspoň dvakrát. Den s už zapsaným tréninkem se přeskočí.
 */
export function trainingReminders(
  data: TrainingData,
  opts: {
    time: string;
    now?: Date;
    days?: number;
    weekdayName: (w: number) => string;
    exerciseName: (id: string, customName?: string) => string;
    texts: { planned: string; habit: string; habitBody: string };
  },
): Reminder[] {
  const now = opts.now ?? new Date();
  const logged = new Set(data.logs.map((l) => l.date));
  const from = toISODate(addDays(now, -28));
  const counts = new Map<number, number>();
  for (const l of data.logs) if (l.date >= from && l.date < toISODate(now)) {
    const w = weekdayMon0(parseISODate(l.date));
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const habit = new Set([...counts].filter(([, n]) => n >= 2).map(([w]) => w));
  const out: Reminder[] = [];
  for (let i = 0; i < (opts.days ?? 14); i++) {
    const day = addDays(now, i);
    const iso = toISODate(day);
    if (logged.has(iso)) continue;
    const when = at(day, opts.time);
    if (when.getTime() <= now.getTime()) continue;
    const plan = activePlan(data, iso);
    if (plan) {
      const pd = dayForDate(plan, day);
      if (!pd) continue;
      const names = pd.exercises.slice(0, 4).map((e) => opts.exerciseName(e.exerciseId, e.customName));
      out.push({
        id: `t-${iso}`,
        at: when,
        title: opts.texts.planned.replace('{day}', dayLabel(pd, opts.weekdayName, weekdayMon0(day))),
        body: names.join(' · ') || plan.name,
        url: '/training',
      });
    } else if (habit.has(weekdayMon0(day))) {
      out.push({ id: `t-${iso}`, at: when, title: opts.texts.habit, body: opts.texts.habitBody, url: '/training' });
    }
  }
  return out;
}

/** Připomínky závodů pořádaných klubem uživatele: 2 dny předem v 18:00 (nebo den předem, když už je pozdě). */
export function competitionReminders(
  feed: FeedItem[],
  clubName: string | null,
  opts: { now?: Date; title: string },
): Reminder[] {
  if (!clubName) return [];
  const key = norm(clubName);
  if (key.length < 3) return [];
  const now = opts.now ?? new Date();
  const out: Reminder[] = [];
  for (const e of feed) {
    if (!e.date) continue;
    const date = parseISODate(e.date.slice(0, 10));
    if (date.getTime() < now.getTime() - 86400000 || date.getTime() > addDays(now, 30).getTime()) continue;
    if (!norm(`${e.title} ${e.place ?? ''}`).includes(key)) continue;
    let when = at(addDays(date, -2), '18:00');
    if (when.getTime() <= now.getTime()) when = at(addDays(date, -1), '18:00');
    if (when.getTime() <= now.getTime()) continue;
    out.push({ id: `c-${e.id}`.slice(0, 60), at: when, title: opts.title.replace('{title}', e.title), body: e.place ?? '', url: '/' });
  }
  return out;
}
