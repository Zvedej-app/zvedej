import type { Lang } from '../lib/i18n';
import { uid } from '../lib/id';
import type { Routine, RoutineItem } from '../lib/types';

/** Předlohy rozcviček a doplňků – uživatel si je přidá do svých a upraví. */
type T3 = [cs: string, en: string, sk: string];
const pick = (l: Lang, t: T3) => (l === 'en' ? t[1] : l === 'sk' ? t[2] : t[0]);

const txt = (l: Lang, t: T3, sets = 1, reps = 1): RoutineItem => ({ id: uid('ri'), text: pick(l, t), sets, reps });
const exr = (exerciseId: string, sets: number, reps: number, kg: number | null = null): RoutineItem => ({
  id: uid('ri'),
  exerciseId,
  sets,
  reps,
  kg,
});

export interface RoutinePreset {
  id: string;
  kind: Routine['kind'];
  build: (l: Lang) => Pick<Routine, 'name' | 'items'>;
}

export const ROUTINE_PRESETS: RoutinePreset[] = [
  {
    id: 'wu-lift',
    kind: 'warmup',
    build: (l) => ({
      name: pick(l, ['Rozcvička – vzpírání', 'Warm-up – weightlifting', 'Rozcvička – vzpieranie']),
      items: [
        txt(l, ['Kolo nebo veslo 5 min', 'Bike or rower 5 min', 'Bicykel alebo veslo 5 min']),
        txt(l, ['Mobilita kotníků a kyčlí', 'Ankle and hip mobility', 'Mobilita členkov a bedier'], 1, 10),
        txt(l, ['Hrudní páteř a ramena (guma)', 'Thoracic spine and shoulders (band)', 'Hrudná chrbtica a ramená (guma)'], 2, 10),
        exr('overhead_squat', 2, 5, 20),
        exr('snatch_balance', 2, 3, 20),
        txt(l, ['Prázdná osa: tah, přemístění, výraz', 'Empty bar: pull, clean, jerk', 'Prázdna os: ťah, premiestnenie, výraz'], 2, 3),
      ],
    }),
  },
  {
    id: 'wu-squat',
    kind: 'warmup',
    build: (l) => ({
      name: pick(l, ['Rozcvička – dřep a síla', 'Warm-up – squat and strength', 'Rozcvička – drep a sila']),
      items: [
        txt(l, ['Švihadlo nebo kolo 5 min', 'Jump rope or bike 5 min', 'Švihadlo alebo bicykel 5 min']),
        txt(l, ['Kozácký dřep', 'Cossack squat', 'Kozácky drep'], 2, 6),
        txt(l, ['Gobletový dřep s výdrží', 'Goblet squat with pause', 'Gobletový drep s výdržou'], 2, 8),
        exr('back_squat', 2, 5, 20),
      ],
    }),
  },
  {
    id: 'acc-back',
    kind: 'accessory',
    build: (l) => ({
      name: pick(l, ['Záda a střed těla', 'Back and core', 'Chrbát a stred tela']),
      items: [exr('back_ext', 3, 12), exr('pullups', 3, 8), exr('core', 3, 15)],
    }),
  },
  {
    id: 'acc-legs',
    kind: 'accessory',
    build: (l) => ({
      name: pick(l, ['Nohy', 'Legs', 'Nohy']),
      items: [exr('bulgarian', 3, 8), exr('rdl', 3, 8), txt(l, ['Lýtka ve stoji', 'Standing calf raises', 'Lýtka v stoji'], 3, 15)],
    }),
  },
  {
    id: 'acc-upper',
    kind: 'accessory',
    build: (l) => ({
      name: pick(l, ['Horní polovina těla', 'Upper body', 'Horná polovica tela']),
      items: [exr('strict_press', 3, 8), exr('row', 3, 10), txt(l, ['Face pull s gumou', 'Band face pulls', 'Face pull s gumou'], 3, 15)],
    }),
  },
];

export function routineFromPreset(p: RoutinePreset, lang: Lang): Routine {
  return { id: uid('rt'), kind: p.kind, ...p.build(lang), updatedAt: new Date().toISOString() };
}
