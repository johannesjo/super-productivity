export const cleanRev = (rev: string): string => {
  const suffix = '-gzip';
  let cleaned = rev;

  // remove -gzip profiles
  if (cleaned.endsWith(suffix)) {
    cleaned = cleaned.slice(0, -suffix.length);
  }

  // Remove leading 'w' or 'W' if present
  if (cleaned.length > 1 && (cleaned[0] === 'w' || cleaned[0] === 'W')) {
    cleaned = cleaned.slice(1);
  }

  return cleaned;
};
