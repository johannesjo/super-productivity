import { Observable, Subject } from 'rxjs';
import { IS_ELECTRON } from '../app.constants';
import { devError } from './dev-error';

const handlerMap: { [key: string]: Observable<any> } = {};

export const ipcEvent$ = (evName: string): Observable<unknown[]> => {
  if (!IS_ELECTRON) {
    devError(`ipcEvent$[${evName}] Not possible outside electron context`);
  }

  const subject = new Subject<unknown[]>();
  if (handlerMap[evName]) {
    console.log(handlerMap);
    devError(`ipcEvent$[${evName}] should only ever be registered once`);
    return handlerMap[evName];
  }
  handlerMap[evName] = subject;

  const handler: (...args: any[]) => void = (...args): void => {
    console.log('ipcEvent$ trigger', evName);
    subject.next([...args]);
  };
  window.ea.on(evName, handler);

  return subject;
  // return subject.pipe(
  //   // finalize(() => {
  //   //   console.log('FINALIZE', evName);
  //   //   // NOTE doesn't work due to the different contexts
  //   //   // window.ea.off(evName, handler);
  //   //   devError(`ipcEvent$[${evName}] observables live forever`);
  //   // }),
  // );
};
