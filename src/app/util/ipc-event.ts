import { Observable, Subject } from 'rxjs';
import { ElectronAPI } from '../../../electron/electronAPI.d';
import { IS_ELECTRON } from '../app.constants';
import { finalize } from 'rxjs/operators';

// TODO check if it works
export const ipcEvent$ = (evName: string): Observable<unknown[]> => {
  if (!IS_ELECTRON) {
    throw new Error('Not possible outside electron context');
  }

  const subject = new Subject<unknown[]>();

  const handler: (...args: any[]) => void = (...args): void => {
    // console.log('HANNDLER');
    subject.next([...args]);
  };
  ((window as any).electronAPI as ElectronAPI).on(evName, handler);

  return subject.pipe(
    finalize(() => {
      // console.log('FINALIZE');
      ((window as any).electronAPI as ElectronAPI).off(evName, handler);
    }),
  );
};

// ipcEvent$('TEST')
//   .pipe(take(1))
//   .subscribe((v) => console.log(1, v));
//
// ipcEvent$('TEST')
//   .pipe(take(1))
//   .subscribe((v) => console.log(2, v));
