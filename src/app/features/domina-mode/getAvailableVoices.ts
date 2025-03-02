export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  const synth = window.speechSynthesis;
  if (!synth) {
    console.warn('window.speechSynthesis not available');
    return [];
  }

  return synth.getVoices();
};

export const getDefaultVoice = (): string => {
  const voices = getAvailableVoices();
  if (voices.length === 0) {
    return 'null';
  }
  //"null" should theoretically use the default voice
  const defaultVoice = voices.find((voice) => voice.default);
  return defaultVoice ? defaultVoice.voiceURI : voices[0].voiceURI;
};
