import { Dictionary, EntityState } from '@ngrx/entity';
import { arrayToDictionary } from './array-to-dictionary';

export const fakeEntityStateFromArray = <T>(
  items: { [key: string]: any }[],
): EntityState<T> => {
  const dict = arrayToDictionary(items) as Dictionary<T>;
  const ids = items.map((item) => item.id);
  return {
    entities: dict,
    ids,
  };
};

export const fakeEntityStateFromNumbersArray = <T>(...nrs: number[]): EntityState<T> => {
  const items: any = nrs.map((nr) => ({ id: '_' + nr }));

  const dict = arrayToDictionary(items) as Dictionary<T>;
  return {
    entities: dict,
    ids: Object.keys(dict),
  };
};
