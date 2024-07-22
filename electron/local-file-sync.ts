import { IPC } from './shared-with-frontend/ipc-events.const';
import { SyncGetRevResult } from '../src/app/imex/sync/sync.model';
import { readFileSync, statSync, writeFileSync } from 'fs';
import { error, log } from 'electron-log/main';
import { ipcMain } from 'electron';

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
        console.log('I am here!');

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
      try {
        console.log(IPC.FILE_SYNC_GET_REV_AND_CLIENT_UPDATE, filePath, localRev);
        console.log('getRev and stuuff');
        readFileSync(filePath);
        return {
          rev: getRev(filePath),
        };
      } catch (e) {
        log('ERR: Sync error while getting meta for ' + filePath);
        error(e);
        // TODO improve
        return 'NO_REMOTE_DATA';
      }
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
};

const getRev = (filePath: string): string => {
  const fileStat = statSync(filePath);
  return fileStat.ctime.getTime().toString();
};
