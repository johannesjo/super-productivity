import { Dictionary } from '@ngrx/entity';

export const arrayToDictionary = <T>(arr: T[]): Dictionary<T> => {
  return arr.reduce(
    (acc: any, sc): Dictionary<unknown> => ({
      ...acc,
      [(sc as any).id]: sc,
    }),
    {},
  );
};
