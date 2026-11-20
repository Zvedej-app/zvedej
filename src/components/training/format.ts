import { effectivePercent, schemeKg } from '../../lib/training';
import type { SetScheme, TrainingData, TrainingPlan } from '../../lib/types';
import { formatNumber, formatWeight, type Unit } from '../../lib/units';

export function schemeLabel(
  s: SetScheme,
  data: TrainingData,
  plan: TrainingPlan | null,
  week: number,
  unit: Unit,
  roundingKg: number,
) {
  const base = `${s.sets} × ${s.reps}`;
  const l = s.load;
  if (l.type === 'percent') {
    const pct = effectivePercent(l, plan, week) ?? l.value;
    const kg = schemeKg(s, data.maxes, plan, week, roundingKg);
    return `${base} @ ${formatNumber(pct)} %${kg ? ` · ${formatWeight(kg, unit)}` : ''}`;
  }
  if (l.type === 'kg') return `${base} @ ${formatWeight(l.value, unit)}`;
  if (l.type === 'rpe') return `${base} @ RPE ${formatNumber(l.value)}`;
  return base;
}

export function formatTonnage(kg: number, unit: Unit) {
  if (unit === 'lb') {
    const lb = kg / 0.45359237;
    return lb >= 10000 ? `${formatNumber(lb / 1000, 1)}k lb` : `${Math.round(lb)} lb`;
  }
  return kg >= 1000 ? `${formatNumber(kg / 1000, 2)} t` : `${Math.round(kg)} kg`;
}
