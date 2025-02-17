const synth = window.speechSynthesis;

export const speak = (text: string, volume: number,voice?:SpeechSynthesisVoice): void => {
  if (!synth) {
    console.warn('No window.speechSynthesis available.');
    return;
  }

  synth.cancel();
  const utter = new SpeechSynthesisUtterance();
  console.log(synth.getVoices());
  utter.text = text;
  utter.voice = voice || synth.getVoices().find(v => v.default) || null;
  utter.volume = volume;

  synth.speak(utter);
};
