
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  const synth = window.speechSynthesis;
  console.log(synth.getVoices());
  return synth.getVoices()
}
