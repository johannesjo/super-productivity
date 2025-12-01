import { isObject } from './is-object';
import { HANDLED_ERROR_PROP_STR } from '../app.constants';

export const getErrorTxt = (err: unknown): string => {
  if (err && isObject((err as any).error)) {
    return (
      (err as any).error.message ||
      (err as any).error.name ||
      // for ngx translate...
      (isObject((err as any).error.error)
        ? (err as any).error.error.toString()
        : (err as any).error) ||
      (err as any).error
    );
  } else if (err && (err as any)[HANDLED_ERROR_PROP_STR]) {
    return (err as any)[HANDLED_ERROR_PROP_STR];
  } else if (err && (err as any).toString) {
    return (err as any).toString();
  } else if (typeof err === 'string') {
    return err;
  } else {
    return 'Unknown getErrorTxt error';
  }
};
