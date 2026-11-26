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
  'Pondělí',
  'Úterý',
  'Středa',
  'Čtvrtek',
  'Pátek',
  'Sobota',
  'Neděle',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'Pondelok',
  'Utorok',
  'Streda',
  'Štvrtok',
  'Piatok',
  'Nedeľa',
];

/** Dny pojmenované podle dne v týdnu se automaticky přejmenují podle dne, kdy je otevřeš. */
const day = (name: string, weekdays: number[], exercises: PlanExercise[]): PlanDay => ({
  id: uid('pd'),
  name,
  weekdays,
  nameAuto: WEEKDAY_NAMES.includes(name),
  exercises,
});

export type TemplateLevel = 'beginner' | 'intermediate' | 'advanced';
export type TemplateGoal = 'technique' | 'general' | 'strength' | 'competition';

export interface PlanTemplate {
  id: string;
  label: TKey;
  level: TemplateLevel;
  goal: TemplateGoal;
  /** krátký popis pro knihovnu plánů */
  desc: (lang: 'cs' | 'en' | 'sk') => string;
  build: (lang: 'cs' | 'en' | 'sk') => Pick<TrainingPlan, 'name' | 'days' | 'weeks' | 'weeklyIncrementPct' | 'note'>;
}

/** Cvik s náročností RPE místo procent (pro ty, kdo nemají zadaná maxima). */
const exR = (exerciseId: string, schemes: [sets: number, reps: number, rpe?: number][]): PlanExercise => ({
  id: uid('pe'),
  exerciseId,
  schemes: schemes.map(
    ([sets, reps, rpe]): SetScheme => ({
      id: uid('ss'),
      sets,
      reps,
      load: rpe ? { type: 'rpe', value: rpe } : { type: 'none' },
    }),
  ),
});

const dn = (lang: string, cs: string, en: string, sk: string) => (lang === 'en' ? en : lang === 'sk' ? sk : cs);

export const TEMPLATES: PlanTemplate[] = [
  {
    id: '3day',
    label: 'tr.template.3day',
    level: 'intermediate',
    goal: 'general',
    desc: (l) =>
      dn(
        l,
        'Vyvážený plán na 4 týdny: den trhu, den nadhozu a kombinovaný den. Postupně přidává 2,5 % týdně.',
        'A balanced 4-week plan: a snatch day, a clean & jerk day and a combo day. Adds 2.5% each week.',
        'Vyvážený plán na 4 týždne: deň trhu, deň nadhodu a kombinovaný deň. Postupne pridáva 2,5 % týždenne.',
      ),
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
    level: 'intermediate',
    goal: 'general',
    desc: (l) =>
      dn(
        l,
        'Čtyři tréninky týdně s těžším sobotním dnem. Pro ty, kdo už trénují pravidelně aspoň rok.',
        'Four sessions a week with a heavier Saturday. For lifters who have trained regularly for at least a year.',
        'Štyri tréningy týždenne s ťažším sobotným dňom. Pre tých, čo už trénujú pravidelne aspoň rok.',
      ),
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
    level: 'advanced',
    goal: 'general',
    desc: (l) =>
      dn(
        l,
        'Šest týdnů po pěti trénincích: objem na začátku týdne, technika ve středu a těžká sobota.',
        'Six weeks of five sessions: volume early in the week, technique on Wednesday and a heavy Saturday.',
        'Šesť týždňov po piatich tréningoch: objem na začiatku týždňa, technika v stredu a ťažká sobota.',
      ),
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
  {
    id: 'beginner8',
    label: 'tr.template.beginner8',
    level: 'beginner',
    goal: 'technique',
    desc: (l) =>
      dn(
        l,
        'Prvních 8 týdnů ve vzpírání: 3 tréninky týdně, lehké váhy a hodně opakování techniky. Procenta počítej z odhadu maxima – stačí zhruba.',
        'Your first 8 weeks of weightlifting: 3 sessions a week, light weights and lots of technique practice. Base the percentages on a rough estimate of your max.',
        'Prvých 8 týždňov vo vzpieraní: 3 tréningy týždenne, ľahké váhy a veľa opakovaní techniky. Percentá počítaj z odhadu maxima – stačí zhruba.',
      ),
    build: (l) => ({
      name: dn(l, 'Začátečník 8 týdnů', 'Beginner 8 weeks', 'Začiatočník 8 týždňov'),
      weeks: 8,
      weeklyIncrementPct: 1.5,
      note: dn(
        l,
        'Váhu zvyšuj, jen když jsou všechna opakování technicky čistá. Rozcvičku s prázdnou osou nevynechávej.',
        'Only add weight when every rep is technically clean. Never skip the empty-bar warm-up.',
        'Váhu zvyšuj, len keď sú všetky opakovania technicky čisté. Rozcvičku s prázdnou osou nevynechávaj.',
      ),
      days: [
        day(
          dn(l, 'Den A – trh', 'Day A – snatch', 'Deň A – trh'),
          [0],
          [
            ex('overhead_squat', [[3, 5, 50]], 'snatch'),
            ex('hang_snatch', [[5, 3, 55]], 'snatch'),
            ex('snatch_pull', [[3, 4, 70]], 'snatch'),
            ex('back_squat', [[3, 6, 60]]),
            ex('core', [[3, 15]]),
          ],
        ),
        day(
          dn(l, 'Den B – nadhoz', 'Day B – clean & jerk', 'Deň B – nadhod'),
          [2],
          [
            ex('hang_clean', [[5, 3, 55]], 'clean_jerk'),
            ex('push_press', [[4, 4, 50]], 'clean_jerk'),
            ex('front_squat', [[3, 5, 60]]),
            ex('pullups', [[3, 6]]),
          ],
        ),
        day(
          dn(l, 'Den C – celé pohyby', 'Day C – full lifts', 'Deň C – celé pohyby'),
          [4],
          [ex('snatch', [[5, 2, 60]]), ex('clean_jerk', [[5, 1, 60]]), ex('back_squat', [[3, 5, 65]]), ex('back_ext', [[3, 12]])],
        ),
      ],
    }),
  },
  {
    id: 'comp6',
    label: 'tr.template.comp6',
    level: 'advanced',
    goal: 'competition',
    desc: (l) =>
      dn(
        l,
        'Šest týdnů před závodem: méně opakování, vyšší intenzita a nácvik závodních pokusů. Plán začni 6 týdnů před závodem, v posledním týdnu jen lehké rozcvičení.',
        'Six weeks before a competition: fewer reps, higher intensity and practising competition attempts. Start 6 weeks out; keep the final week light.',
        'Šesť týždňov pred pretekmi: menej opakovaní, vyššia intenzita a nácvik pretekových pokusov. Plán začni 6 týždňov pred pretekmi, v poslednom týždni len ľahké rozcvičenie.',
      ),
    build: (l) => ({
      name: dn(l, 'Příprava na závod 6 týdnů', 'Competition prep 6 weeks', 'Príprava na preteky 6 týždňov'),
      weeks: 6,
      weeklyIncrementPct: 2,
      note: dn(
        l,
        'Poslední týden před závodem: jen 2 lehké tréninky do 70–80 %, žádné maximální pokusy.',
        'Final week before the meet: just 2 light sessions up to 70–80%, no max attempts.',
        'Posledný týždeň pred pretekmi: len 2 ľahké tréningy do 70–80 %, žiadne maximálne pokusy.',
      ),
      days: [
        day(
          dn(l, 'Po – trh těžce', 'Mon – heavy snatch', 'Po – trh ťažko'),
          [0],
          [
            ex('snatch', [
              [2, 1, 80],
              [2, 1, 85],
              [2, 1, 80],
            ]),
            ex('snatch_pull', [[3, 2, 100]], 'snatch'),
            ex('back_squat', [[4, 2, 82]]),
          ],
        ),
        day(
          dn(l, 'St – nadhoz těžce', 'Wed – heavy C&J', 'St – nadhod ťažko'),
          [2],
          [
            ex('clean_jerk', [
              [2, 1, 80],
              [2, 1, 85],
              [2, 1, 80],
            ]),
            ex('jerk_rack', [[3, 2, 85]], 'clean_jerk'),
            ex('front_squat', [[3, 2, 82]]),
          ],
        ),
        day(
          dn(l, 'Pá – rychlost', 'Fri – speed', 'Pi – rýchlosť'),
          [4],
          [
            ex('power_snatch', [[4, 2, 70]], 'snatch'),
            ex('power_clean', [[4, 2, 70]], 'clean_jerk'),
            ex('clean_pull', [[3, 3, 95]], 'clean_jerk'),
          ],
        ),
        day(
          dn(l, 'So – závodní pokusy', 'Sat – competition attempts', 'So – pretekové pokusy'),
          [5],
          [
            ex('snatch', [
              [1, 1, 85],
              [1, 1, 90],
              [1, 1, 93],
            ]),
            ex('clean_jerk', [
              [1, 1, 85],
              [1, 1, 90],
              [1, 1, 93],
            ]),
          ],
        ),
      ],
    }),
  },
  {
    id: 'strength4',
    label: 'tr.template.strength4',
    level: 'intermediate',
    goal: 'strength',
    desc: (l) =>
      dn(
        l,
        'Čtyřtýdenní silový blok mimo závodní sezónu: hodně dřepů, tahů a tlaků, trh a nadhoz jen pro udržení techniky.',
        'A 4-week off-season strength block: lots of squats, pulls and presses, with the snatch and C&J just to keep technique sharp.',
        'Štvortýždňový silový blok mimo pretekovej sezóny: veľa drepov, ťahov a tlakov, trh a nadhod len na udržanie techniky.',
      ),
    build: (l) => ({
      name: dn(l, 'Silový blok 4 týdny', 'Strength block 4 weeks', 'Silový blok 4 týždne'),
      weeks: 4,
      weeklyIncrementPct: 2.5,
      days: [
        day(
          dn(l, 'Den A – dřep + tah', 'Day A – squat + pull', 'Deň A – drep + ťah'),
          [0],
          [
            ex('power_snatch', [[4, 2, 65]], 'snatch'),
            ex('back_squat', [[5, 5, 75]]),
            ex('snatch_deadlift', [[4, 4, 95]], 'snatch'),
            ex('row', [[4, 8]]),
          ],
        ),
        day(
          dn(l, 'Den B – tlaky', 'Day B – presses', 'Deň B – tlaky'),
          [2],
          [
            ex('power_clean', [[4, 2, 65]], 'clean_jerk'),
            ex('push_press', [[5, 3, 75]], 'clean_jerk'),
            ex('strict_press', [[4, 5, 72]]),
            ex('bulgarian', [[3, 8]]),
          ],
        ),
        day(
          dn(l, 'Den C – přední dřep + tah', 'Day C – front squat + pull', 'Deň C – predný drep + ťah'),
          [4],
          [
            ex('front_squat', [[5, 3, 78]]),
            ex('clean_deadlift', [[4, 4, 100]], 'clean_jerk'),
            ex('rdl', [[3, 6]]),
            ex('core', [[3, 15]]),
          ],
        ),
      ],
    }),
  },
  {
    id: 'technique',
    label: 'tr.template.technique',
    level: 'beginner',
    goal: 'technique',
    desc: (l) =>
      dn(
        l,
        'Technický plán s variantami z visu a z bloků. Hodí se po pauze, po zranění nebo k opravě chyb, na které upozornil trenér.',
        'A technique-focused plan with hang and block variations. Good after a break, after an injury or to fix faults your coach pointed out.',
        'Technický plán s variantmi z visu a z blokov. Hodí sa po pauze, po zranení alebo na opravu chýb, na ktoré upozornil tréner.',
      ),
    build: (l) => ({
      name: dn(l, 'Technika trhu a nadhozu', 'Snatch & C&J technique', 'Technika trhu a nadhodu'),
      weeks: 3,
      weeklyIncrementPct: 0,
      days: [
        day(
          dn(l, 'Den A – trh', 'Day A – snatch', 'Deň A – trh'),
          [0],
          [
            ex('snatch_balance', [[4, 3, 55]], 'snatch'),
            ex('hang_snatch', [[5, 2, 60]], 'snatch'),
            ex('block_snatch', [[4, 2, 65]], 'snatch'),
            ex('overhead_squat', [[3, 3, 60]], 'snatch'),
          ],
        ),
        day(
          dn(l, 'Den B – nadhoz', 'Day B – clean & jerk', 'Deň B – nadhod'),
          [2],
          [
            ex('hang_clean', [[5, 2, 60]], 'clean_jerk'),
            ex('block_clean', [[4, 2, 65]], 'clean_jerk'),
            ex('jerk_dip', [[3, 3, 70]], 'clean_jerk'),
            ex('split_jerk', [[4, 2, 60]], 'clean_jerk'),
          ],
        ),
        day(
          dn(l, 'Den C – celé pohyby', 'Day C – full lifts', 'Deň C – celé pohyby'),
          [4],
          [ex('snatch', [[6, 1, 65]]), ex('clean_jerk', [[6, 1, 65]]), ex('front_squat', [[3, 3, 70]])],
        ),
      ],
    }),
  },
  {
    id: 'rpe3',
    label: 'tr.template.rpe3',
    level: 'beginner',
    goal: 'general',
    desc: (l) =>
      dn(
        l,
        'Plán bez procent – nepotřebuješ znát svá maxima. Váhu volíš podle náročnosti RPE (10 = nic víc už nezvedneš, 7 = ještě by šly 3 opakování).',
        "A plan without percentages – you don't need to know your maxes. Pick the weight by RPE (10 = nothing left, 7 = three more reps possible).",
        'Plán bez percent – nepotrebuješ poznať svoje maximá. Váhu voliš podľa náročnosti RPE (10 = viac už nezdvihneš, 7 = ešte by išli 3 opakovania).',
      ),
    build: (l) => ({
      name: dn(l, 'Podle pocitu (RPE) 3× týdně', 'By feel (RPE) 3× a week', 'Podľa pocitu (RPE) 3× týždenne'),
      weeks: 4,
      weeklyIncrementPct: 0,
      days: [
        day(
          dn(l, 'Den A', 'Day A', 'Deň A'),
          [0],
          [exR('snatch', [[5, 2, 7]]), exR('back_squat', [[4, 5, 7]]), exR('pullups', [[3, 8]])],
        ),
        day(
          dn(l, 'Den B', 'Day B', 'Deň B'),
          [2],
          [exR('clean_jerk', [[5, 1, 7]]), exR('front_squat', [[4, 3, 7]]), exR('strict_press', [[3, 6, 7]])],
        ),
        day(
          dn(l, 'Den C', 'Day C', 'Deň C'),
          [4],
          [
            exR('snatch', [[3, 1, 8]]),
            exR('clean_jerk', [[3, 1, 8]]),
            exR('snatch_pull', [[3, 3, 8]]),
            exR('back_ext', [[3, 12]]),
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
