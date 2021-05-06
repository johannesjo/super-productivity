import { devError } from './dev-error';
import { arrayEquals } from './array-equals';

export const checkFixEntityStateConsistency = (data: any, additionalStr = ''): any => {
  if (!isEntityStateConsistent(data, additionalStr)) {
    // fix if possible
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
  }

  return data;
};

export const isEntityStateConsistent = (data: any, additionalStr = ''): boolean => {
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
