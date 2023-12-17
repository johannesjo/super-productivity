import { Observable, Subject } from 'rxjs';
import { IS_ELECTRON } from '../app.constants';
import { finalize } from 'rxjs/operators';

export const ipcEvent$ = (evName: string): Observable<unknown[]> => {
  if (!IS_ELECTRON) {
    throw new Error('Not possible outside electron context');
  }

  const subject = new Subject<unknown[]>();

  const handler: (...args: any[]) => void = (...args): void => {
    subject.next([...args]);
  };
  window.ea.on(evName, handler);

  return subject.pipe(
    finalize(() => {
      console.log('FINALIZE', evName);
      // NOTE doesn't work due to the different contexts
      // window.ea.off(evName, handler);
      throw new Error(`ipcEvent$[${evName}] observables live forever`);
    }),
  );
};
