const synth = window.speechSynthesis;

export const speak = (text: string, volume: number): void => {
  if (!synth) {
    console.warn('No window.speechSynthesis available.');
    return;
  }

  synth.cancel();
  const utter = new SpeechSynthesisUtterance();
  utter.text = text;
  utter.volume = volume;
  synth.speak(utter);
};
