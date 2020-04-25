import {devError} from './dev-error';

export const checkFixEntityStateConsistency = (data: any, additionalStr = ''): any => {
  if (!data
    || !data.entities
    || !data.ids
    || Object.keys(data.entities).length !== data.ids.length) {
    console.log(data);
    devError(`Inconsistent entity state "${additionalStr}"`);

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
