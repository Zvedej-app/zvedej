import { Asset } from 'expo-asset';

/**
 * Zvuk konce pauzy ve webové verzi (aplikace na ploše iPhonu).
 *
 * Safari v iPhonu přehraje zvuk jen tehdy, když ho spustí dotyk prstem. Zvuk spuštěný
 * časovačem na konci pauzy by zablokoval (a pustil ho až při dalším dotyku).
 * Proto při odškrtnutí série (to je dotyk) „odemkneme“ Web Audio a zvuk si předem
 * načteme; na konci pauzy ho pak odemčený přehrávač zahraje kdykoli.
 */
export type RestSound = 'none' | 'gong' | 'whistle' | 'bell';
export const REST_SOUNDS: RestSound[] = ['gong', 'whistle', 'bell', 'none'];

const SOURCES = {
  gong: require('../../assets/sounds/gong.wav'),
  whistle: require('../../assets/sounds/whistle.wav'),
  bell: require('../../assets/sounds/bell.wav'),
};

type Ctx = AudioContext;
let ctx: Ctx | null = null;
const buffers: Partial<Record<Exclude<RestSound, 'none'>, AudioBuffer>> = {};
const loading: Partial<Record<Exclude<RestSound, 'none'>, Promise<AudioBuffer | null>>> = {};

function getCtx(): Ctx | null {
  if (ctx) return ctx;
  const AC =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function load(kind: Exclude<RestSound, 'none'>): Promise<AudioBuffer | null> {
  if (buffers[kind]) return Promise.resolve(buffers[kind]!);
  if (loading[kind]) return loading[kind]!;
  const c = getCtx();
  if (!c) return Promise.resolve(null);
  loading[kind] = (async () => {
    try {
      const uri = Asset.fromModule(SOURCES[kind]).uri;
      const data = await (await fetch(uri)).arrayBuffer();
      // starší Safari zná jen variantu s callbacky
      const buf = await new Promise<AudioBuffer>((res, rej) => c.decodeAudioData(data, res, rej));
      buffers[kind] = buf;
      return buf;
    } catch {
      return null;
    } finally {
      delete loading[kind];
    }
  })();
  return loading[kind]!;
}

/** Volat při dotyku (odškrtnutí série): odemkne zvuk a předem ho načte. */
export function primeRestSound(kind: RestSound) {
  const c = getCtx();
  if (!c) return;
  if (c.state !== 'running') c.resume().catch(() => {});
  // krátké ticho přehrané během dotyku odemkne zvuk v Safari natrvalo
  try {
    const silent = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = silent;
    src.connect(c.destination);
    src.start(0);
  } catch {}
  if (kind !== 'none') load(kind);
}

/** Přehraje zvolený zvuk konce pauzy. */
export async function playRestSound(kind: RestSound) {
  if (kind === 'none') return;
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state !== 'running') await c.resume();
    const buf = await load(kind);
    if (!buf) return;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
  } catch {}
}
