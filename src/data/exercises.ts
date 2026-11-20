import type { Lang } from '../lib/i18n';

export type ExerciseGroup = 'snatch' | 'clean' | 'jerk' | 'squat' | 'pull' | 'press' | 'accessory';

export interface Exercise {
  id: string;
  group: ExerciseGroup;
  name: Record<Lang, string>;
  /** z jakého maxima se počítají procenta (výchozí) */
  pctOf: string;
}

const e = (id: string, group: ExerciseGroup, cs: string, en: string, sk: string, pctOf = id): Exercise => ({
  id,
  group,
  name: { cs, en, sk },
  pctOf,
});

export const EXERCISES: Exercise[] = [
  // trh
  e('snatch', 'snatch', 'Trh', 'Snatch', 'Trh'),
  e('power_snatch', 'snatch', 'Trh do polodřepu', 'Power snatch', 'Trh do polodrepu', 'snatch'),
  e('hang_snatch', 'snatch', 'Trh z visu', 'Hang snatch', 'Trh z visu', 'snatch'),
  e('block_snatch', 'snatch', 'Trh z bloků', 'Block snatch', 'Trh z blokov', 'snatch'),
  e('muscle_snatch', 'snatch', 'Trh silou (muscle snatch)', 'Muscle snatch', 'Trh silou', 'snatch'),
  e('snatch_balance', 'snatch', 'Snatch balance', 'Snatch balance', 'Snatch balance', 'snatch'),
  e('overhead_squat', 'snatch', 'Dřep s činkou nad hlavou', 'Overhead squat', 'Drep s činkou nad hlavou', 'snatch'),
  e('snatch_pull', 'pull', 'Trhový tah', 'Snatch pull', 'Trhový ťah', 'snatch'),
  e('snatch_deadlift', 'pull', 'Trhový mrtvý tah', 'Snatch deadlift', 'Trhový mŕtvy ťah', 'snatch'),
  e('snatch_high_pull', 'pull', 'Trhový vysoký tah', 'Snatch high pull', 'Trhový vysoký ťah', 'snatch'),
  // přemístění + nadhoz
  e('clean_jerk', 'clean', 'Nadhoz', 'Clean & jerk', 'Nadhod'),
  e('clean', 'clean', 'Přemístění', 'Clean', 'Premiestnenie', 'clean_jerk'),
  e('power_clean', 'clean', 'Přemístění do polodřepu', 'Power clean', 'Premiestnenie do polodrepu', 'clean_jerk'),
  e('hang_clean', 'clean', 'Přemístění z visu', 'Hang clean', 'Premiestnenie z visu', 'clean_jerk'),
  e('block_clean', 'clean', 'Přemístění z bloků', 'Block clean', 'Premiestnenie z blokov', 'clean_jerk'),
  e('clean_pull', 'pull', 'Nadhozový tah', 'Clean pull', 'Nadhodový ťah', 'clean_jerk'),
  e('clean_deadlift', 'pull', 'Nadhozový mrtvý tah', 'Clean deadlift', 'Nadhodový mŕtvy ťah', 'clean_jerk'),
  e('jerk', 'jerk', 'Výraz', 'Jerk', 'Výraz', 'clean_jerk'),
  e('split_jerk', 'jerk', 'Výraz do nůžek', 'Split jerk', 'Výraz do nožníc', 'clean_jerk'),
  e('power_jerk', 'jerk', 'Výraz do polodřepu', 'Power jerk', 'Výraz do polodrepu', 'clean_jerk'),
  e('push_press', 'jerk', 'Výraz silou (push press)', 'Push press', 'Push press', 'clean_jerk'),
  e('jerk_rack', 'jerk', 'Výraz ze stojanu', 'Jerk from rack', 'Výraz zo stojana', 'clean_jerk'),
  e('jerk_dip', 'jerk', 'Podřep pro výraz', 'Jerk dip', 'Podrep pre výraz', 'clean_jerk'),
  // dřepy
  e('back_squat', 'squat', 'Dřep vzadu', 'Back squat', 'Drep vzadu'),
  e('front_squat', 'squat', 'Dřep vpředu', 'Front squat', 'Drep vpredu'),
  e('pause_squat', 'squat', 'Dřep s výdrží', 'Pause squat', 'Drep s výdržou', 'back_squat'),
  // tlaky
  e('strict_press', 'press', 'Tlak vstoje', 'Strict press', 'Tlak v stoji'),
  e('bench_press', 'press', 'Bench press', 'Bench press', 'Bench press'),
  e('snatch_press', 'press', 'Trhový tlak za hlavou', 'Snatch press', 'Trhový tlak za hlavou', 'strict_press'),
  // doplňky
  e('deadlift', 'pull', 'Mrtvý tah', 'Deadlift', 'Mŕtvy ťah'),
  e('rdl', 'accessory', 'Rumunský mrtvý tah', 'Romanian deadlift', 'Rumunský mŕtvy ťah', 'deadlift'),
  e('good_morning', 'accessory', 'Good morning', 'Good morning', 'Good morning', 'back_squat'),
  e('lunges', 'accessory', 'Výpady', 'Lunges', 'Výpady', 'back_squat'),
  e('bulgarian', 'accessory', 'Bulharský dřep', 'Bulgarian split squat', 'Bulharský drep', 'back_squat'),
  e('row', 'accessory', 'Přítahy v předklonu', 'Bent-over row', 'Príťahy v predklone', 'deadlift'),
  e('pullups', 'accessory', 'Shyby', 'Pull-ups', 'Zhyby', 'pullups'),
  e('back_ext', 'accessory', 'Hyperextenze', 'Back extensions', 'Hyperextenzie', 'back_ext'),
  e('core', 'accessory', 'Zpevnění středu těla', 'Core', 'Spevnenie stredu tela', 'core'),
  e('box_jump', 'accessory', 'Výskoky na bednu', 'Box jumps', 'Výskoky na debnu', 'box_jump'),
];

export const MAX_LIFTS = ['snatch', 'clean_jerk', 'clean', 'jerk', 'back_squat', 'front_squat', 'deadlift', 'strict_press'];

export const GROUP_LABEL: Record<ExerciseGroup, Record<Lang, string>> = {
  snatch: { cs: 'Trh', en: 'Snatch', sk: 'Trh' },
  clean: { cs: 'Přemístění a nadhoz', en: 'Clean', sk: 'Premiestnenie a nadhod' },
  jerk: { cs: 'Výraz', en: 'Jerk', sk: 'Výraz' },
  squat: { cs: 'Dřepy', en: 'Squats', sk: 'Drepy' },
  pull: { cs: 'Tahy', en: 'Pulls', sk: 'Ťahy' },
  press: { cs: 'Tlaky', en: 'Presses', sk: 'Tlaky' },
  accessory: { cs: 'Doplňkové', en: 'Accessories', sk: 'Doplnkové' },
};

const byId = new Map(EXERCISES.map((x) => [x.id, x]));

export function getExercise(id: string) {
  return byId.get(id);
}

export function exerciseName(id: string, lang: Lang, custom?: { id: string; name: string }[], customName?: string) {
  if (customName) return customName;
  const ex = byId.get(id);
  if (ex) return ex.name[lang];
  return custom?.find((c) => c.id === id)?.name ?? id;
}
