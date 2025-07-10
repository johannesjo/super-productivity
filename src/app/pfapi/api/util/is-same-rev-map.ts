import { RevMap } from '../pfapi.model';
import { SyncLog } from '../../../core/log';

export const isSameRevMap = (revMap1: RevMap, revMap2: RevMap): boolean => {
  if (Object.keys(revMap1).length !== Object.keys(revMap2).length) {
    return false;
  }

  for (const key in revMap1) {
    if (revMap1[key] !== revMap2[key]) {
      SyncLog.critical(`${isSameRevMap.name}(): ${key} is different`, {
        revMap1,
        revMap2,
      });
      return false;
    }
  }

  return true;
};
