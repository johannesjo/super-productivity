import { environment } from '../../environments/environment';
import { Log } from '../core/log';

let isShowAlert = true;

export const devError = (errStr: string | Error | unknown): void => {
  if (environment.production) {
    Log.err(errStr);
    // TODO add super simple snack message if possible
  } else {
    if (isShowAlert) {
      alert('devERR: ' + errStr);
      isShowAlert = false;
    }
    if (confirm(`Throw an error for error? ––– ${errStr}`)) {
      throw new Error(errStr as string);
    }
  }
};
