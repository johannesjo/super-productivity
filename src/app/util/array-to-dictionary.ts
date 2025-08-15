import { Dictionary } from '@ngrx/entity';

export const arrayToDictionary = <T extends { id: string | number }>(
  arr: T[],
): Dictionary<T> => {
  return arr.reduce(
    (acc: Dictionary<T>, sc): Dictionary<T> => ({
      ...acc,
      [sc.id]: sc,
    }),
    {},
  );
};
