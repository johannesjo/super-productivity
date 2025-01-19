import { SimpleCounterCfgFields } from './simple-counter.model';

const FIELDS_TO_COMPARE: (keyof SimpleCounterCfgFields)[] = [
  'id',
  'title',
  'isEnabled',
  'icon',
  'type',
  'countdownDuration',
];

export const isEqualSimpleCounterCfg = (a: any, b: any): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; ++i) {
      if (a[i] !== b[i]) {
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let j = 0; j < FIELDS_TO_COMPARE.length; j++) {
          const field: any = FIELDS_TO_COMPARE[j];
          if (a[field] !== b[field]) {
            return false;
          }
        }
      }
    }
    return true;
  } else {
    return a === b;
  }
};
