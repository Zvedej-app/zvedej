export type Experience = 'new' | 'mid' | 'pro';
export type PerWeek = 3 | 4 | 5;
export type Goal = 'general' | 'technique' | 'strength' | 'competition';

/** Doporučený plán z knihovny podle odpovědí v úvodním průvodci. */
export function recommendTemplate(a: { exp: Experience; perWeek: PerWeek; goal: Goal; knowsMaxes: boolean }): string {
  if (!a.knowsMaxes) return 'rpe3';
  if (a.exp === 'new') return a.goal === 'strength' ? 'strength4' : 'beginner8';
  if (a.goal === 'competition') return a.exp === 'pro' ? 'comp6' : '4day';
  if (a.goal === 'strength') return 'strength4';
  if (a.goal === 'technique') return 'technique';
  if (a.perWeek === 3) return '3day';
  if (a.perWeek === 4) return '4day';
  return a.exp === 'pro' ? '5day' : '4day';
}
