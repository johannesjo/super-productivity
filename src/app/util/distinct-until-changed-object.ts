import { isObject } from './is-object';

export const distinctUntilChangedObject = (a: any, b: any): boolean => {
  if ((isObject(a) && isObject(b)) || (Array.isArray(a) && Array.isArray(b))) {
    return JSON.stringify(a) === JSON.stringify(b);
  } else {
    return a === b;
  }
};
