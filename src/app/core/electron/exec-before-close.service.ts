import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { IPC } from '../../../../electron/shared-with-frontend/ipc-events.const';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { IS_ELECTRON } from '../../app.constants';
import { ipcRenderer } from 'electron';
import { ipcEvent$ } from '../../util/ipc-event';

@Injectable({ providedIn: 'root' })
export class ExecBeforeCloseService {
  ipcRenderer: typeof ipcRenderer = this._electronService
    .ipcRenderer as typeof ipcRenderer;
  onBeforeClose$: Observable<string[]> = IS_ELECTRON
    ? ipcEvent$(IPC.NOTIFY_ON_CLOSE).pipe(map(([, ids]: any) => ids))
    : of([]);

  constructor(private _electronService: ElectronService) {}

  schedule(id: string): void {
    this.ipcRenderer.send(IPC.REGISTER_BEFORE_CLOSE, { id });
  }

  unschedule(id: string): void {
    this.ipcRenderer.send(IPC.UNREGISTER_BEFORE_CLOSE, { id });
  }

  setDone(id: string): void {
    this.ipcRenderer.send(IPC.BEFORE_CLOSE_DONE, { id });
  }
}
