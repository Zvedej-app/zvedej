import { useEffect, useRef } from 'react';

type Listener = (tab: string) => void;
const listeners = new Set<Listener>();

/** Volá spodní lišta, když uživatel přepne do jiné sekce. */
export function emitTabEnter(tab: string) {
  listeners.forEach((l) => l(tab));
}

/**
 * Zavolá `reset`, když se uživatel přes spodní lištu přepne do sekce `tab`
 * z jiné sekce. Sekce se tak vždy otevře na výchozí záložce.
 */
export function useTabEnter(tab: string, reset: () => void) {
  const ref = useRef(reset);
  useEffect(() => {
    ref.current = reset;
  });
  useEffect(() => {
    const l: Listener = (t) => {
      if (t === tab) ref.current();
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [tab]);
}
