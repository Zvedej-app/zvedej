import type { ChallengeTheme } from '../lib/types';

/**
 * Záložní témata výzvy. Pokud administrátor nezadá téma v databázi
 * (tabulka monthly_challenges), použije se téma podle čísla měsíce.
 */
const FALLBACK: Omit<ChallengeTheme, 'month'>[] = [
  {
    title: { cs: 'Novoroční trh', en: 'New Year snatch', sk: 'Novoročný trh' },
    description: {
      cs: 'Ukaž svůj nejlepší trh do nového roku.',
      en: 'Show your best snatch of the new year.',
      sk: 'Ukáž svoj najlepší trh do nového roka.',
    },
  },
  {
    title: { cs: 'Výraz bez chyby', en: 'Perfect jerk', sk: 'Výraz bez chyby' },
    description: {
      cs: 'Stabilní fixace nad hlavou – technika je král.',
      en: 'Rock-solid overhead lockout – technique is king.',
      sk: 'Stabilná fixácia nad hlavou – technika je kráľ.',
    },
  },
  {
    title: { cs: 'Dřepová síla', en: 'Squat strength', sk: 'Drepová sila' },
    description: {
      cs: 'Dřep vpředu nebo vzadu – ukaž sílu nohou.',
      en: 'Front or back squat – show your leg strength.',
      sk: 'Drep vpredu alebo vzadu – ukáž silu nôh.',
    },
  },
  {
    title: { cs: 'Přemístění z visu', en: 'Hang clean', sk: 'Premiestnenie z visu' },
    description: { cs: 'Rychlé lokty, pevný stoj.', en: 'Fast elbows, solid receive.', sk: 'Rýchle lakte, pevný stoj.' },
  },
  {
    title: { cs: 'Komplex dne', en: 'Complex of the day', sk: 'Komplex dňa' },
    description: {
      cs: 'Vymysli a zvedni vlastní komplex.',
      en: 'Create and lift your own complex.',
      sk: 'Vymysli a zdvihni vlastný komplex.',
    },
  },
  {
    title: { cs: 'Trh z bloků', en: 'Block snatch', sk: 'Trh z blokov' },
    description: { cs: 'Výbušnost od kolen nahoru.', en: 'Explosiveness from the knees up.', sk: 'Výbušnosť od kolien nahor.' },
  },
  {
    title: { cs: 'Letní PR', en: 'Summer PR', sk: 'Letný PR' },
    description: {
      cs: 'Překonal(a) jsi osobák? Pochlub se!',
      en: 'Hit a PR? Show it off!',
      sk: 'Prekonal(a) si osobák? Pochváľ sa!',
    },
  },
  {
    title: { cs: 'Technika v pomalém pohybu', en: 'Slow-motion technique', sk: 'Technika v spomalenom zábere' },
    description: {
      cs: 'Natoč zvednutí ve zpomaleném záběru.',
      en: 'Film a lift in slow motion.',
      sk: 'Natoč zdvih v spomalenom zábere.',
    },
  },
  {
    title: { cs: 'Zpátky do tréninku', en: 'Back to training', sk: 'Späť do tréningu' },
    description: {
      cs: 'Nová sezóna začíná – ukaž formu.',
      en: 'New season starts – show your form.',
      sk: 'Nová sezóna začína – ukáž formu.',
    },
  },
  {
    title: { cs: 'Nadhoz na maximum', en: 'Max clean & jerk', sk: 'Nadhod na maximum' },
    description: { cs: 'Nejtěžší nadhoz měsíce.', en: 'Heaviest clean & jerk of the month.', sk: 'Najťažší nadhod mesiaca.' },
  },
  {
    title: { cs: 'Tahy a síla zad', en: 'Pulls & back strength', sk: 'Ťahy a sila chrbta' },
    description: { cs: 'Tahy, mrtvé tahy, přítahy.', en: 'Pulls, deadlifts, rows.', sk: 'Ťahy, mŕtve ťahy, príťahy.' },
  },
  {
    title: { cs: 'Vánoční dvojboj', en: 'Christmas total', sk: 'Vianočný dvojboj' },
    description: {
      cs: 'Trh i nadhoz v jednom videu.',
      en: 'Snatch and clean & jerk in one video.',
      sk: 'Trh aj nadhod v jednom videu.',
    },
  },
];

export function fallbackTheme(month: string): ChallengeTheme {
  const m = Number(month.split('-')[1]) - 1;
  return { month, ...FALLBACK[m % 12] };
}
