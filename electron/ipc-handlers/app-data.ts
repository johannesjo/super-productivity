import { app, ipcMain } from 'electron';
import { IPC } from '../shared-with-frontend/ipc-events.const';
import { BACKUP_DIR, BACKUP_DIR_WINSTORE } from '../backup';

export const initAppDataIpc = (): void => {
  ipcMain.handle(IPC.GET_PATH, (ev, name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0]);
  });

  ipcMain.handle(IPC.GET_BACKUP_PATH, () => {
    if (process?.windowsStore) {
      return BACKUP_DIR_WINSTORE;
    } else {
      return BACKUP_DIR;
    }
  });
};
