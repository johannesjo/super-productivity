import { Injectable } from '@angular/core';
import { IPC } from '../../../../electron/shared-with-frontend/ipc-events.const';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { IS_ELECTRON } from '../../app.constants';
import { ipcEvent$ } from '../../util/ipc-event';

@Injectable({ providedIn: 'root' })
export class ExecBeforeCloseService {
  onBeforeClose$: Observable<string[]> = IS_ELECTRON
    ? ipcEvent$(IPC.NOTIFY_ON_CLOSE).pipe(map(([, ids]: any) => ids))
    : of([]);

  constructor() {}

  schedule(id: string): void {
    window.electronAPI.scheduleRegisterBeforeClose(id);
  }

  unschedule(id: string): void {
    window.electronAPI.unscheduleRegisterBeforeClose(id);
  }

  setDone(id: string): void {
    window.electronAPI.setDoneRegisterBeforeClose(id);
  }
}
