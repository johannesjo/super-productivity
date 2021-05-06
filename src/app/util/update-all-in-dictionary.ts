import { Dictionary } from '@ngrx/entity';

export const updateAllInDictionary = <T>(
  oldD: Dictionary<T>,
  changes: Partial<T>,
): Dictionary<T> => {
  const newD: any = {};
  const ids = Object.keys(oldD);

  ids.forEach((id: string) => {
    newD[id] = {
      ...oldD[id],
      ...changes,
    };
  });

  return newD;
};
