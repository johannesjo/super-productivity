import {devError} from './dev-error';

export const checkEntityStateConsistency = (data: any, additionalStr = '') => {
  if (!data
    || !data.entities
    || !data.ids
    || Object.keys(data.entities).length !== data.ids) {
    console.log(data);
    devError(`Inconsistent entity state ${additionalStr}`);
  }
};
