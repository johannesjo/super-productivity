import { devError } from './dev-error';
import { arrayEquals } from './array-equals';
import { Dictionary } from '@ngrx/entity';

export const checkFixEntityStateConsistency = <T extends Dictionary<any>>(
  data: T,
  additionalStr = '',
): T => {
  if (!isEntityStateConsistent(data, additionalStr)) {
    return fixEntityStateConsistency(data);
  }

  return data;
};

export const isEntityStateConsistent = <T extends Dictionary<any>>(
  data: T,
  additionalStr = '',
): boolean => {
  if (
    !data ||
    !data.entities ||
    !data.ids ||
    Object.keys(data.entities).length !== data.ids.length ||
    !arrayEquals(Object.keys(data.entities).sort(), [...data.ids].sort())
  ) {
    console.log(data);
    devError(`Inconsistent entity state "${additionalStr}"`);
    return false;
  }
  return true;
};

export const fixEntityStateConsistency = <T extends Dictionary<any>>(data: T): T => {
  if (Object.keys(data.entities).length !== data.ids.length) {
    console.log({
      ...data,
      ids: Object.keys(data.entities),
    });

    return {
      ...data,
      ids: Object.keys(data.entities),
    };
  }
  return data;
};

export const fixEntityStateConsistencyOrError = <T extends Dictionary<any>>(
  data: T,
): T => {
  if (Object.keys(data.entities).length !== data.ids.length) {
    console.log({
      ...data,
      ids: Object.keys(data.entities),
    });

    return {
      ...data,
      ids: Object.keys(data.entities),
    };
  }

  throw new Error('Could not fix entity state');
};
