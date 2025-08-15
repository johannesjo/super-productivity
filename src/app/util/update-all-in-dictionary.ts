import { Dictionary } from '@ngrx/entity';

export const updateAllInDictionary = <T>(
  oldD: Dictionary<T>,
  changes: Partial<T>,
): Dictionary<T> => {
  const newD: Dictionary<T> = {};
  const ids = Object.keys(oldD);

  ids.forEach((id: string) => {
    newD[id] = {
      ...oldD[id],
      ...changes,
    } as T;
  });

  return newD;
};
