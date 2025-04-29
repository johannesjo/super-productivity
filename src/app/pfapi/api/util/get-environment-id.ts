export const getEnvironmentId = (): string => {
  let platformCode = 'UNK'; // Default: Unknown
  let osCode = 'UNK';

  // Detect Electron
  const isElectron = typeof process !== 'undefined' && process.versions?.electron;
  if (isElectron) {
    platformCode = 'E';
  }
  // Detect Android WebView
  else if (/Android/.test(navigator.userAgent) && /wv/.test(navigator.userAgent)) {
    platformCode = 'AND';
  }
  // Detect Regular Browser
  else {
    platformCode = 'B';
  }

  // Detect OS
  if (navigator.userAgent.includes('Win')) {
    osCode = 'W';
  } else if (navigator.userAgent.includes('Mac')) {
    osCode = 'M';
  } else if (
    navigator.userAgent.includes('Linux') ||
    navigator.userAgent.includes('X11')
  ) {
    osCode = 'L';
  } else if (navigator.userAgent.includes('Android')) {
    osCode = 'A';
  } else if (
    navigator.userAgent.includes('iOS') ||
    navigator.userAgent.includes('iPhone') ||
    navigator.userAgent.includes('iPad')
  ) {
    osCode = 'I';
  }

  // Detect Browser if not Electron or WebView
  let browserCode = 'UNK';
  if (!isElectron && platformCode === 'B') {
    if (navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Edg/')) {
      browserCode = 'C';
    } else if (navigator.userAgent.includes('Firefox')) {
      browserCode = 'F';
    } else if (
      navigator.userAgent.includes('Safari') &&
      !navigator.userAgent.includes('Chrome')
    ) {
      browserCode = 'S';
    } else if (navigator.userAgent.includes('Edg/')) {
      browserCode = 'E';
    }
  }

  // Construct the final 3-letter ID
  return isElectron
    ? `${platformCode}_${osCode}`
    : platformCode === 'AND'
      ? platformCode
      : `${platformCode}${browserCode}${osCode}`;
};
