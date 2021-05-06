export const unique = <T>(array: T[]): T[] =>
  array.filter((v, i, a) => a.indexOf(v) === i);
