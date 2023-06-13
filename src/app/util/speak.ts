const synth = window.speechSynthesis;
console.log(synth);
console.log(synth.getVoices());

export const speak = (text: string): void => {
  const utter = new SpeechSynthesisUtterance();

  console.log('SPEAK ', text);

  utter.text = text;
  console.log(utter);
  utter.onend = (event) => {
    console.log('Speech complete');
  };
  synth.speak(utter);
};
