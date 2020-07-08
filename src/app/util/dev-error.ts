import { environment } from '../../environments/environment';

let isShowAlert = true;

export function devError(errStr: any) {
  if (environment.production) {
    console.error(errStr);
    // TODO add super simple snack message if possible
  } else {
    if (isShowAlert) {
      alert('Critical devError ' + errStr);
      isShowAlert = false;
    }
    throw new Error(errStr);
  }
}
