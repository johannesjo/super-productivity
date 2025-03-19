export const cleanRev = (rev: string): string => {
  const suffix = '-gzip';
  if (rev.endsWith(suffix)) {
    return rev.slice(0, -suffix.length);
  }
  return rev;
};
