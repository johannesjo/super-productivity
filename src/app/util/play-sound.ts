const BASE = './assets/snd';

export const playSound = (filePath: string, vol = 100): void => {
  const file = `${BASE}/${filePath}`;

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

        if (vol !== 100) {
          const gainNode = audioCtx.createGain();
          gainNode.gain.value = vol / 100;
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
