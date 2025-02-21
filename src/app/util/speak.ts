const synth = window.speechSynthesis;

export const speak = (text: string, volume: number, voice: string): void => {
  if (!synth) {
    console.warn('No window.speechSynthesis available.');
    return;
  }

  synth.cancel();
  const utter = new SpeechSynthesisUtterance();
  utter.text = text;
  utter.voice =
    synth.getVoices().find((v) => v.name === voice) ||
    synth.getVoices().find((v) => v.default) ||
    null;
  utter.volume = volume;

  synth.speak(utter);
};
