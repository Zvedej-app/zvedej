import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export type RestSound = 'none' | 'gong' | 'whistle' | 'bell';
export const REST_SOUNDS: RestSound[] = ['gong', 'whistle', 'bell', 'none'];

const SOURCES = {
  gong: require('../../assets/sounds/gong.wav'),
  whistle: require('../../assets/sounds/whistle.wav'),
  bell: require('../../assets/sounds/bell.wav'),
};

/** V nativní aplikaci není potřeba nic odemykat (na webu viz restSound.web.ts). */
export function primeRestSound(_kind: RestSound) {}

/** Přehraje zvolený zvuk (i při ztlumeném tlačítku telefonu). */
export async function playRestSound(kind: RestSound) {
  if (kind === 'none') return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
    const player = createAudioPlayer(SOURCES[kind]);
    player.play();
    setTimeout(() => {
      try {
        player.remove();
      } catch {}
    }, 8000);
  } catch {}
}
