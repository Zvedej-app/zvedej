/**
 * Dialogy a upozornění v designu aplikace (žádná šedá systémová okna).
 * Vykresluje je <DialogHost /> v kořenovém layoutu.
 */
export interface ConfirmOptions {
  ok: string;
  cancel: string;
  destructive?: boolean;
  title?: string;
}

export type DialogRequest =
  | { kind: 'confirm'; message: string; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'notify'; message: string; resolve: () => void }
  | { kind: 'toast'; message: string; id: number };

type Listener = (r: DialogRequest) => void;
let listener: Listener | null = null;
let toastId = 0;

export function subscribeDialogs(l: Listener) {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
}

/** Potvrzovací dialog – vrací true po potvrzení. */
export function confirm(message: string, options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!listener) return resolve(typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(message) : true);
    listener({ kind: 'confirm', message, options, resolve });
  });
}

/** Informační okno s tlačítkem OK. */
export function notify(message: string): Promise<void> {
  return new Promise((resolve) => {
    if (!listener) return resolve();
    listener({ kind: 'notify', message, resolve });
  });
}

/** Krátká nenápadná zpráva dole (např. „Trénink uložen“). */
export function toast(message: string) {
  listener?.({ kind: 'toast', message, id: ++toastId });
}
