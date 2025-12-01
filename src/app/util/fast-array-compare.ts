export const fastArrayCompare = <T>(a: T[], b: T[]): boolean => {
  return a.length === b.length && a.every((v, i) => v === b[i]);
};
