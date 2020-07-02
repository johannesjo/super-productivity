import { isObject } from './is-object';

export const distinctUntilChangedObject = (a, b): boolean => {
  if ((isObject(a) && isObject(b)) || (Array.isArray(a) && Array.isArray(b))) {
    return (JSON.stringify(a) === JSON.stringify(b));
  } else {
    return a === b;
  }
};
