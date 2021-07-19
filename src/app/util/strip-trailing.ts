export const stripTrailing = (str: string, toBeStripped: string): string => {
  return str.endsWith(toBeStripped) && toBeStripped.length > 0
    ? str.slice(0, -1 * toBeStripped.length)
    : str;
};
