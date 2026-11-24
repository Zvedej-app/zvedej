/** Jednoduché události pauzy z oznámení (hodinky, zamčená obrazovka) pro obrazovku tréninku. */
type Listener = (e: { type: 'extend'; seconds: number }) => void;
const listeners = new Set<Listener>();

export function onRestEvent(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function emitRestEvent(e: { type: 'extend'; seconds: number }) {
  listeners.forEach((l) => l(e));
}
