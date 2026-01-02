import { getAudioBuffer, getAudioContext } from './audio-context';

const BASE = './assets/snd';

/**
 * Plays a sound file at the specified volume.
 * Uses a singleton AudioContext and caches audio buffers to prevent resource leaks.
 *
 * @param filePath - Path to the sound file relative to assets/snd
 * @param vol - Volume level from 0 to 100 (default: 100)
 */
export const playSound = (filePath: string, vol = 100): void => {
  const file = `${BASE}/${filePath}`;

  getAudioBuffer(file)
    .then((buffer) => {
      const audioCtx = getAudioContext();
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;

      if (vol !== 100) {
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = vol / 100;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);
      } else {
        source.connect(audioCtx.destination);
      }

      source.start(0);
    })
    .catch((e) => {
      console.error('Error playing sound:', e);
    });
};
