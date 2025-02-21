export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  const synth = window.speechSynthesis;
  return synth.getVoices();
};

export const getDefaultVoice = (): string => {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    return 'null';
  }
  //"null" should theoretically use the default voice
  const defaultVoice = voices.find((voice) => voice.default);
  return defaultVoice ? defaultVoice.voiceURI : voices[0].voiceURI;
};
