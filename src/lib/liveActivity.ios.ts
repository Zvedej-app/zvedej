import { addUserInteractionListener, type LiveActivity } from 'expo-widgets';
import RestActivityFactory, { type RestActivityProps } from '../widgets/RestActivity';
import type { RestActivityInput } from './liveActivity';

export type { RestActivityInput } from './liveActivity';

let current: LiveActivity<RestActivityProps> | null = null;
let currentProps: RestActivityProps | null = null;

function toProps(i: RestActivityInput): RestActivityProps {
  return {
    start: i.start,
    end: i.end,
    exercise: i.exercise,
    load: i.load,
    over: false,
    done: false,
    doneLabel: i.labels.done,
    restLabel: i.labels.rest,
    nextLabel: i.labels.next,
  };
}

/** Spustí (nebo přepíše) Live Activity s odpočtem pauzy. */
export async function startRestActivity(input: RestActivityInput) {
  try {
    const props = toProps(input);
    currentProps = props;
    if (current) {
      await current.update(props, new Date(input.end + 5 * 60 * 1000));
    } else {
      // staré aktivity po pádu aplikace ukončíme
      for (const a of RestActivityFactory.getInstances()) await a.end('immediate');
      current = RestActivityFactory.start(props, 'zvedej://workout', new Date(input.end + 5 * 60 * 1000));
    }
  } catch {}
}

/** Pauza skončila – na zamčené obrazovce se zvětší název dalšího cviku s odškrtnutím. */
export async function markRestOver() {
  try {
    if (current && currentProps) {
      currentProps = { ...currentProps, over: true };
      await current.update(currentProps);
    }
  } catch {}
}

export async function endRestActivity() {
  try {
    await current?.end('immediate');
  } catch {}
  current = null;
  currentProps = null;
}

/** Klepnutí na „odškrtnout“ v Live Activity (doručí se, když aplikace běží). */
export function onLiveActivityDone(cb: () => void) {
  const sub = addUserInteractionListener((e) => {
    if (e.source === 'RestActivity' && e.target === 'markDone') cb();
  });
  return () => sub.remove();
}
