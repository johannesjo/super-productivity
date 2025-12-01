import { Observable, Subject } from 'rxjs';
import { IS_ELECTRON } from '../app.constants';
import { devError } from './dev-error';
import { Log } from '../core/log';

const handlerMap: { [key: string]: Observable<unknown[]> } = {};

export const ipcEvent$ = (evName: string): Observable<unknown[]> => {
  if (!IS_ELECTRON) {
    devError(`ipcEvent$[${evName}] Not possible outside electron context`);
  }

  const subject = new Subject<unknown[]>();
  if (handlerMap[evName]) {
    Log.log(handlerMap);
    devError(`ipcEvent$[${evName}] should only ever be registered once`);
    return handlerMap[evName];
  }
  handlerMap[evName] = subject;

  const handler: (...args: unknown[]) => void = (...args): void => {
    Log.log('ipcEvent$ trigger', evName);
    subject.next([...args]);
  };

  if (!window.ea) {
    Log.err('window.ea is not available. Make sure the preload script is loaded.');
    return subject;
  }

  window.ea.on(evName, handler);

  return subject;
  // return subject.pipe(
  //   // finalize(() => {
  //   //   Log.log('FINALIZE', evName);
  //   //   // NOTE doesn't work due to the different contexts
  //   //   // window.ea.off(evName, handler);
  //   //   devError(`ipcEvent$[${evName}] observables live forever`);
  //   // }),
  // );
};
