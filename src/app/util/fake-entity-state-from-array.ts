import { Dictionary, EntityState } from '@ngrx/entity';
import { arrayToDictionary } from './array-to-dictionary';

export const fakeEntityStateFromArray = <T extends { id: string | number }>(
  items: Partial<T>[],
): EntityState<T> => {
  const dict = arrayToDictionary(items as T[]) as Dictionary<T>;
  const ids = items.map((item) => (item as T).id) as string[] | number[];
  return {
    entities: dict,
    ids,
  };
};

export const fakeEntityStateFromNumbersArray = <T>(...nrs: number[]): EntityState<T> => {
  const items = nrs.map((nr) => ({ id: '_' + nr }));

  const dict = arrayToDictionary(items) as Dictionary<T>;
  return {
    entities: dict,
    ids: Object.keys(dict),
  };
};
