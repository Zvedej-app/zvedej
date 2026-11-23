import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export type RestSound = 'none' | 'gong' | 'beep' | 'bell';
export const REST_SOUNDS: RestSound[] = ['gong', 'beep', 'bell', 'none'];

const SOURCES = {
  gong: require('../../assets/sounds/gong.wav'),
  beep: require('../../assets/sounds/beep.wav'),
  bell: require('../../assets/sounds/bell.wav'),
};

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
