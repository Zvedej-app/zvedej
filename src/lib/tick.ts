import { Platform } from 'react-native';

let ctx: AudioContext | null = null;

/** Krátké „cvaknutí“ při posunu kolečka na webu (na mobilu to řeší haptika). */
export function webTick() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const nav = window.navigator as Navigator & { vibrate?: (p: number) => boolean };
    nav.vibrate?.(6);
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1900, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.02);
  } catch {}
}
