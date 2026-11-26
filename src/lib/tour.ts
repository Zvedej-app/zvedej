import type { View } from 'react-native';

/**
 * Prohlídka ovládání (jako „průvodce“ v Native Land): kroky zvýrazní prvek na obrazovce
 * a vedle něj ukážou krátké vysvětlení. Prvky se registrují přes <TourTarget id="…">.
 */
type ViewRef = React.ComponentRef<typeof View>;
type Target = React.RefObject<ViewRef | null>;
const targets = new Map<string, Target>();

export function registerTarget(id: string, ref: Target) {
  targets.set(id, ref);
  return () => {
    if (targets.get(id) === ref) targets.delete(id);
  };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function measureTarget(id: string): Promise<Rect | null> {
  const ref = targets.get(id);
  const node = ref?.current;
  if (!node) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      node.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
    } catch {
      resolve(null);
    }
    setTimeout(() => resolve(null), 600);
  });
}

/* --- spuštění prohlídky odkudkoli (Nastavení → Návod, konec úvodního průvodce) --- */
type Listener = (state: TourState) => void;
export interface TourState {
  step: number | null;
}
let state: TourState = { step: null };
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l(state));

export function startTour(from = 0) {
  state = { step: from };
  emit();
}
export function setTourStep(step: number | null) {
  state = { step };
  emit();
}
export function subscribeTour(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function getTourState() {
  return state;
}
