import { uid } from '../lib/id';
import type { PlanDay, PlanExercise, SetScheme, TrainingPlan } from '../lib/types';
import { todayISO } from '../lib/date';
import type { TKey } from '../lib/i18n';

type S = [sets: number, reps: number, pct?: number];

const ex = (exerciseId: string, schemes: S[], pctOf?: string): PlanExercise => ({
  id: uid('pe'),
  exerciseId,
  schemes: schemes.map(
    ([sets, reps, pct]): SetScheme => ({
      id: uid('ss'),
      sets,
      reps,
      load: pct ? { type: 'percent', value: pct, of: pctOf ?? exerciseId } : { type: 'none' },
    }),
  ),
});

const WEEKDAY_NAMES = [
  'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Nedeľa',
];

/** Dny pojmenované podle dne v týdnu se automaticky přejmenují podle dne, kdy je otevřeš. */
const day = (name: string, weekdays: number[], exercises: PlanExercise[]): PlanDay => ({
  id: uid('pd'),
  name,
  weekdays,
  nameAuto: WEEKDAY_NAMES.includes(name),
  exercises,
});

export interface PlanTemplate {
  id: string;
  label: TKey;
  build: (lang: 'cs' | 'en' | 'sk') => Pick<TrainingPlan, 'name' | 'days' | 'weeks' | 'weeklyIncrementPct'>;
}

const dn = (lang: string, cs: string, en: string, sk: string) => (lang === 'en' ? en : lang === 'sk' ? sk : cs);

export const TEMPLATES: PlanTemplate[] = [
  {
    id: '3day',
    label: 'tr.template.3day',
    build: (l) => ({
      name: dn(l, 'Klasika 3× týdně', 'Classic 3× a week', 'Klasika 3× týždenne'),
      weeks: 4,
      weeklyIncrementPct: 2.5,
      days: [
        day(
          dn(l, 'Den A – trh', 'Day A – snatch', 'Deň A – trh'),
          [0],
          [
            ex('snatch', [[5, 2, 70]]),
            ex('snatch_pull', [[4, 3, 90]], 'snatch'),
            ex('back_squat', [[4, 5, 70]]),
            ex('core', [[3, 15]]),
          ],
        ),
        day(
          dn(l, 'Den B – nadhoz', 'Day B – clean & jerk', 'Deň B – nadhod'),
          [2],
          [
            ex('clean_jerk', [[5, 1, 70]]),
            ex('clean_pull', [[4, 3, 90]], 'clean_jerk'),
            ex('front_squat', [[4, 3, 70]]),
            ex('strict_press', [[3, 6, 65]]),
          ],
        ),
        day(
          dn(l, 'Den C – kombinace', 'Day C – combo', 'Deň C – kombinácia'),
          [4],
          [
            ex('power_snatch', [[4, 2, 65]], 'snatch'),
            ex('power_clean', [[4, 2, 65]], 'clean_jerk'),
            ex('jerk_rack', [[4, 2, 70]], 'clean_jerk'),
            ex('back_squat', [[3, 3, 78]]),
          ],
        ),
      ],
    }),
  },
  {
    id: '4day',
    label: 'tr.template.4day',
    build: (l) => ({
      name: dn(l, 'Vzpírání 4× týdně', 'Weightlifting 4× a week', 'Vzpieranie 4× týždenne'),
      weeks: 4,
      weeklyIncrementPct: 2.5,
      days: [
        day(
          dn(l, 'Pondělí', 'Monday', 'Pondelok'),
          [0],
          [
            ex('snatch', [
              [3, 2, 70],
              [3, 2, 75],
            ]),
            ex('clean_jerk', [
              [3, 1, 70],
              [2, 1, 75],
            ]),
            ex('back_squat', [[5, 3, 75]]),
          ],
        ),
        day(
          dn(l, 'Úterý', 'Tuesday', 'Utorok'),
          [1],
          [
            ex('hang_snatch', [[4, 2, 65]], 'snatch'),
            ex('snatch_pull', [[4, 3, 95]], 'snatch'),
            ex('strict_press', [[4, 5, 65]]),
            ex('back_ext', [[3, 12]]),
          ],
        ),
        day(
          dn(l, 'Čtvrtek', 'Thursday', 'Štvrtok'),
          [3],
          [ex('power_snatch', [[5, 2, 65]], 'snatch'), ex('clean', [[4, 2, 75]], 'clean_jerk'), ex('front_squat', [[5, 2, 75]])],
        ),
        day(
          dn(l, 'Sobota', 'Saturday', 'Sobota'),
          [5],
          [
            ex('snatch', [
              [1, 1, 80],
              [1, 1, 85],
              [3, 1, 80],
            ]),
            ex('clean_jerk', [
              [1, 1, 80],
              [1, 1, 85],
              [3, 1, 80],
            ]),
            ex('clean_pull', [[3, 3, 100]], 'clean_jerk'),
          ],
        ),
      ],
    }),
  },
  {
    id: '5day',
    label: 'tr.template.5day',
    build: (l) => ({
      name: dn(l, 'Pokročilý 5× týdně', 'Advanced 5× a week', 'Pokročilý 5× týždenne'),
      weeks: 6,
      weeklyIncrementPct: 2,
      days: [
        day(
          dn(l, 'Po – trh + dřep', 'Mon – snatch + squat', 'Po – trh + drep'),
          [0],
          [ex('snatch', [[6, 2, 75]]), ex('snatch_pull', [[4, 3, 100]], 'snatch'), ex('back_squat', [[5, 4, 75]])],
        ),
        day(
          dn(l, 'Út – nadhoz', 'Tue – C&J', 'Ut – nadhod'),
          [1],
          [ex('clean_jerk', [[6, 1, 75]]), ex('jerk_rack', [[4, 2, 80]], 'clean_jerk'), ex('row', [[4, 8]])],
        ),
        day(
          dn(l, 'St – technika', 'Wed – technique', 'St – technika'),
          [2],
          [
            ex('hang_snatch', [[5, 2, 65]], 'snatch'),
            ex('hang_clean', [[5, 2, 65]], 'clean_jerk'),
            ex('front_squat', [[4, 3, 75]]),
          ],
        ),
        day(
          dn(l, 'Pá – síla', 'Fri – strength', 'Pi – sila'),
          [4],
          [
            ex('power_snatch', [[4, 2, 70]], 'snatch'),
            ex('clean_pull', [[5, 3, 100]], 'clean_jerk'),
            ex('back_squat', [[4, 3, 82]]),
            ex('strict_press', [[4, 5, 70]]),
          ],
        ),
        day(
          dn(l, 'So – max', 'Sat – heavy', 'So – max'),
          [5],
          [
            ex('snatch', [
              [1, 1, 85],
              [1, 1, 90],
              [2, 1, 85],
            ]),
            ex('clean_jerk', [
              [1, 1, 85],
              [1, 1, 90],
              [2, 1, 85],
            ]),
            ex('front_squat', [[3, 2, 80]]),
          ],
        ),
      ],
    }),
  },
];

export function newPlan(partial?: Partial<TrainingPlan>): TrainingPlan {
  const now = new Date().toISOString();
  return {
    id: uid('pl'),
    name: '',
    startDate: todayISO(),
    endDate: null,
    status: 'draft',
    days: [],
    weeks: null,
    weeklyIncrementPct: 0,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}
