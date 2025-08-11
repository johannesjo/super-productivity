import { ipcEvent$ } from '../util/ipc-event';
import { IPC } from '../../../electron/shared-with-frontend/ipc-events.const';
import { map } from 'rxjs/operators';
import { EMPTY, Observable } from 'rxjs';
import { IS_ELECTRON } from '../app.constants';

export const ipcIdleTime$: Observable<number> = IS_ELECTRON
  ? ipcEvent$(IPC.IDLE_TIME).pipe(map(([ev, idleTimeInMs]) => idleTimeInMs as number))
  : EMPTY;

export const ipcAnyFileDownloaded$: Observable<unknown> = IS_ELECTRON
  ? ipcEvent$(IPC.ANY_FILE_DOWNLOADED).pipe()
  : EMPTY;

export const ipcNotifyOnClose$: Observable<unknown> = IS_ELECTRON
  ? ipcEvent$(IPC.NOTIFY_ON_CLOSE).pipe()
  : EMPTY;

export const ipcResume$: Observable<unknown> = IS_ELECTRON
  ? ipcEvent$(IPC.RESUME).pipe()
  : EMPTY;
export const ipcSuspend$: Observable<unknown> = IS_ELECTRON
  ? ipcEvent$(IPC.SUSPEND).pipe()
  : EMPTY;

export const ipcShowAddTaskBar$: Observable<unknown> = IS_ELECTRON
  ? ipcEvent$(IPC.SHOW_ADD_TASK_BAR).pipe()
  : EMPTY;

export const ipcAddTaskFromAppUri$: Observable<{ title: string }> = IS_ELECTRON
  ? ipcEvent$(IPC.ADD_TASK_FROM_APP_URI).pipe(
      map(([ev, data]) => data as { title: string }),
    )
  : EMPTY;
