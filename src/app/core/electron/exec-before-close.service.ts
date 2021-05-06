import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { IPC } from '../../../../electron/ipc-events.const';
import { fromEvent, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { IS_ELECTRON } from '../../app.constants';
import { ipcRenderer } from 'electron';

@Injectable({ providedIn: 'root' })
export class ExecBeforeCloseService {
  ipcRenderer: typeof ipcRenderer = this._electronService
    .ipcRenderer as typeof ipcRenderer;
  onBeforeClose$: Observable<string[]> = IS_ELECTRON
    ? fromEvent(this.ipcRenderer, IPC.NOTIFY_ON_CLOSE).pipe(map(([, ids]: any) => ids))
    : of([]);

  constructor(private _electronService: ElectronService) {}

  schedule(id: string) {
    this.ipcRenderer.send(IPC.REGISTER_BEFORE_CLOSE, { id });
  }

  unschedule(id: string) {
    this.ipcRenderer.send(IPC.UNREGISTER_BEFORE_CLOSE, { id });
  }

  setDone(id: string) {
    this.ipcRenderer.send(IPC.BEFORE_CLOSE_DONE, { id });
  }
}
