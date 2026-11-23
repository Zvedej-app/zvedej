/**
 * Živý odpočet pauzy na zamčené obrazovce. Skutečná implementace je v liveActivity.ios.ts
 * (iOS Live Activity). Na Androidu a webu se nic nespouští – Android dostane klasické oznámení.
 */
export interface RestActivityInput {
  start: number;
  end: number;
  exercise: string;
  load: string;
  loggedExId: string;
  setIndex: number;
  labels: { done: string; rest: string; next: string };
}

export async function startRestActivity(_input: RestActivityInput) {}
export async function markRestOver() {}
export async function endRestActivity() {}
export function onLiveActivityDone(_cb: () => void) {
  return () => {};
}
