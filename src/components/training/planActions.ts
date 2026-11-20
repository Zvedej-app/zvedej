import { newPlan, TEMPLATES } from '../../data/templates';
import type { Lang } from '../../lib/i18n';
import { useTraining } from '../../providers/TrainingProvider';

type TrainingCtx = ReturnType<typeof useTraining>;

/** Vytvoří plán ze šablony; pokud activate, rovnou ho aktivuje. Vrací id. */
export function createPlanFromTemplate(training: TrainingCtx, templateId: string, lang: Lang, activate: boolean) {
  const tp = TEMPLATES.find((x) => x.id === templateId);
  if (!tp) throw new Error('unknown template');
  const plan = newPlan({ ...tp.build(lang), status: 'draft' });
  training.savePlan(plan);
  if (activate) training.activatePlan(plan.id);
  return plan.id;
}
