import { IPC } from './shared-with-frontend/ipc-events.const';
import { SyncGetRevResult } from '../src/app/imex/sync/sync.model';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { error, log } from 'electron-log/main';
import { dialog, ipcMain } from 'electron';
import { getWin } from './main-window';

export const initLocalFileSyncAdapter = (): void => {
  ipcMain.handle(
    IPC.FILE_SYNC_SAVE,
    (
      ev,
      {
        filePath,
        dataStr,
        localRev,
      }: {
        filePath: string;
        dataStr: string;
        localRev: string | null;
      },
    ): string | Error => {
      try {
        console.log(IPC.FILE_SYNC_SAVE, filePath);
        console.log('writeFileSync', filePath, !!dataStr);

        writeFileSync(filePath, dataStr);

        return getRev(filePath);
      } catch (e) {
        log('ERR: Sync error while writing to ' + filePath);
        error(e);
        return new Error(e as string);
      }
    },
  );

  ipcMain.handle(
    IPC.FILE_SYNC_GET_REV_AND_CLIENT_UPDATE,
    (
      ev,
      {
        filePath,
        localRev,
      }: {
        filePath: string;
        localRev: string | null;
      },
    ): { rev: string; clientUpdate?: number } | SyncGetRevResult => {
      throw new Error('REMOVE AS IMPLEMENTED OTHERWISE');
      // try {
      //   console.log(IPC.FILE_SYNC_GET_REV_AND_CLIENT_UPDATE, filePath, localRev);
      //   console.log('getRev and stuuff');
      //   readFileSync(filePath);
      //   return {
      //     rev: getRev(filePath),
      //   };
      // } catch (e) {
      //   log('ERR: Sync error while getting meta for ' + filePath);
      //   error(e);
      //   // TODO improve
      //   return 'NO_REMOTE_DATA';
      // }
    },
  );

  ipcMain.handle(
    IPC.FILE_SYNC_LOAD,
    (
      ev,
      {
        filePath,
        localRev,
      }: {
        filePath: string;
        localRev: string | null;
      },
    ): { rev: string; dataStr: string | undefined } | Error => {
      try {
        console.log(IPC.FILE_SYNC_LOAD, filePath, localRev);
        const dataStr = readFileSync(filePath, { encoding: 'utf-8' });
        console.log('READ ', dataStr.length);
        return {
          rev: getRev(filePath),
          dataStr,
        };
      } catch (e) {
        log('ERR: Sync error while loading file from ' + filePath);
        error(e);
        return new Error(e as string);
      }
    },
  );

  ipcMain.handle(
    IPC.CHECK_DIR_EXISTS,
    (
      ev,
      {
        dirPath,
      }: {
        dirPath: string;
      },
    ): true | Error => {
      try {
        const r = readdirSync(dirPath);
        console.log(r);
        return true;
      } catch (e) {
        log('ERR: error while checking dir ' + dirPath);
        error(e);
        return new Error(e as string);
      }
    },
  );

  ipcMain.handle(IPC.PICK_DIRECTORY, async (): Promise<string | undefined> => {
    const { canceled, filePaths } = await dialog.showOpenDialog(getWin(), {
      properties: ['openDirectory'],
    });
    if (canceled) {
      return undefined;
    } else {
      return filePaths[0];
    }
  });
};

const getRev = (filePath: string): string => {
  const fileStat = statSync(filePath);
  return fileStat.mtime.getTime().toString();
};
