import { SoundConfig } from '../../config/global-config.model';
import { TaskLog } from '../../../core/log';

export const playDoneSound = (soundCfg: SoundConfig, nrOfDoneTasks: number = 0): void => {
  const speed = 1;
  const BASE = './assets/snd';
  const PITCH_OFFSET = -400;
  const file = `${BASE}/${soundCfg.doneSound}`;
  // const speed = 0.5;
  // const a = new Audio('/assets/snd/done4.mp3');
  // TaskLog.log(a);
  // a.volume = .4;
  // a.playbackRate = 1.5;
  // (a as any).mozPreservesPitch = false;
  // (a as any).webkitPreservesPitch = false;
  // a.play();
  TaskLog.log(file);

  const pitchFactor = soundCfg.isIncreaseDoneSoundPitch
    ? // prettier-ignore
      PITCH_OFFSET + (nrOfDoneTasks * 50)
    : 0;

  const audioCtx = new ((window as any).AudioContext ||
    (window as any).webkitAudioContext)();
  const source = audioCtx.createBufferSource();
  const request = new XMLHttpRequest();
  request.open('GET', file, true);
  request.responseType = 'arraybuffer';
  request.onload = () => {
    const audioData = request.response;
    audioCtx.decodeAudioData(
      audioData,
      (buffer: AudioBuffer) => {
        source.buffer = buffer;
        source.playbackRate.value = speed;
        // source.detune.value = 100; // value in cents
        source.detune.value = pitchFactor; // value in cents

        if (soundCfg.volume !== 100) {
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = soundCfg.volume / 100;
          source.connect(gainNode);
          gainNode.connect(audioCtx.destination);
        } else {
          source.connect(audioCtx.destination);
        }
      },
      (e: DOMException) => {
        throw new Error('Error with decoding audio data SP: ' + e.message);
      },
    );
  };
  request.send();
  source.start(0);
};
