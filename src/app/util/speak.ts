import { Log } from '../core/log';

const synth = window.speechSynthesis;

export const speak = (text: string, volume: number, voice: string): void => {
  if (!synth) {
    Log.err('No window.speechSynthesis available.');
    return;
  }

  synth.cancel();
  const utter = new SpeechSynthesisUtterance();
  utter.text = text;
  utter.voice =
    synth.getVoices().find((v) => voice.includes(v.name)) ||
    synth.getVoices().find((v) => v.default) ||
    null;

  console.log(volume);
  utter.volume = volume / 100;

  synth.speak(utter);
};
