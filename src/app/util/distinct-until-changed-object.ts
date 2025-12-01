import { isObject } from './is-object';

export const distinctUntilChangedObject = <T>(a: T, b: T): boolean => {
  if ((isObject(a) && isObject(b)) || (Array.isArray(a) && Array.isArray(b))) {
    return JSON.stringify(a) === JSON.stringify(b);
  } else {
    return a === b;
  }
};
