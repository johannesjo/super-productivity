import { isObject } from './is-object';

export function getErrorTxt(err: any): unknown {
  if (err && isObject(err.error)) {
    return (err.error.message)
      || (err.error.name)
      // for ngx translate...
      || (isObject(err.error.error)
        ? err.error.error.toString()
        : err.error)
      || err.error;
  } else if (err && err.toString) {
    return err.toString();
  } else {
    return err;
  }
}
