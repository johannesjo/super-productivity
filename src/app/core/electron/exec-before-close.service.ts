import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { IPC } from '../../../../electron/ipc-events.const';
import { fromEvent, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({providedIn: 'root'})
export class ExecBeforeCloseService {

  onBeforeClose$: Observable<string[]> = fromEvent(this._electronService.ipcRenderer, IPC.NOTIFY_ON_CLOSE).pipe(
    map(([, ids]) => ids),
  );

  constructor(
    private _electronService: ElectronService,
  ) {
  }

  schedule(id: string) {
    this._electronService.ipcRenderer.send(IPC.REGISTER_BEFORE_CLOSE, {id});
  }

  unschedule(id: string) {
    this._electronService.ipcRenderer.send(IPC.UNREGISTER_BEFORE_CLOSE, {id});
  }

  setDone(id: string) {
    this._electronService.ipcRenderer.send(IPC.BEFORE_CLOSE_DONE, {id});
  }
}
