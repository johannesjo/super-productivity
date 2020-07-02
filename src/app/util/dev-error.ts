import { environment } from '../../environments/environment';

let isShowAlert = true;

export function devError(errStr: any) {
  if (environment.production) {
    console.error(errStr);
  } else {
    if (isShowAlert) {
      alert('Critical devError ' + errStr);
      isShowAlert = false;
    }
    throw new Error(errStr);
  }
}
