import { environment } from '../../environments/environment';

let isShowAlert = true;

export const devError = (errStr: any): void => {
  if (environment.production) {
    console.error(errStr);
    // TODO add super simple snack message if possible
  } else {
    if (isShowAlert) {
      alert('devERR: ' + errStr);
      isShowAlert = false;
    }
    if (confirm(`Throw an error for error? ––– ${errStr}`)) {
      throw new Error(errStr);
    }
  }
};
