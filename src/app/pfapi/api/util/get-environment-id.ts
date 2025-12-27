/**
 * Returns a single-character platform identifier for compact client IDs.
 * B = Browser, E = Electron, A = Android, I = iOS
 */
export const getEnvironmentId = (): string => {
  // Detect Electron
  const isElectron = typeof process !== 'undefined' && process.versions?.electron;
  if (isElectron) {
    return 'E';
  }

  // Detect Android WebView
  if (/Android/.test(navigator.userAgent) && /wv/.test(navigator.userAgent)) {
    return 'A';
  }

  // Detect iOS
  if (
    navigator.userAgent.includes('iOS') ||
    navigator.userAgent.includes('iPhone') ||
    navigator.userAgent.includes('iPad')
  ) {
    return 'I';
  }

  // Default: Browser
  return 'B';
};
