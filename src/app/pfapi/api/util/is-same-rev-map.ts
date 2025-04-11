import { RevMap } from '../pfapi.model';
import { pfLog } from './log';

export const isSameRevMap = (revMap1: RevMap, revMap2: RevMap): boolean => {
  if (Object.keys(revMap1).length !== Object.keys(revMap2).length) {
    return false;
  }

  for (const key in revMap1) {
    if (revMap1[key] !== revMap2[key]) {
      pfLog(0, `${isSameRevMap.name}(): ${key} is different`, { revMap1, revMap2 });
      return false;
    }
  }

  return true;
};
