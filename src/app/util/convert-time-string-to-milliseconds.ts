export const convertTimeStringToMilliseconds = (
  regex: RegExp,
  time: string,
): number | null => {
  const match = time.match(regex);
  if (!match) return null;
  const hour = parseInt(match[1]) || 0;
  const minute = parseInt(match[2]) || 0;
  // Separate the hour and minute components in order to avoid error
  // "unexpected mix of '*' and '+' in multiplication"
  const hourInMilliseconds = hour * 60 * 60 * 1000;
  const minuteInMilliseconds = minute * 60 * 1000;
  const timeInMilliseconds = hourInMilliseconds + minuteInMilliseconds;
  return timeInMilliseconds;
};
