import { isObject } from './is-object';
import { HANDLED_ERROR_PROP_STR } from '../app.constants';

export const getErrorTxt = (err: any): string => {
  if (err && isObject(err.error)) {
    return (
      err.error.message ||
      err.error.name ||
      // for ngx translate...
      (isObject(err.error.error) ? err.error.error.toString() : err.error) ||
      err.error
    );
  } else if (err && err[HANDLED_ERROR_PROP_STR]) {
    return err[HANDLED_ERROR_PROP_STR];
  } else if (err && err.toString) {
    return err.toString();
  } else if (typeof err === 'string') {
    return err;
  } else {
    return 'Unknown getErrorTxt error';
  }
};
