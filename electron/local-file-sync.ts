import { answerRenderer } from './better-ipc';
import { IPC } from './ipc-events.const';
import { AppDataComplete, SyncGetRevResult } from '../src/app/imex/sync/sync.model';
import { readFileSync, statSync, writeFileSync } from 'fs';
import { error, log } from 'electron-log';

export const initLocalFileSyncAdapter = (): void => {
  answerRenderer(
    IPC.FILE_SYNC_SAVE,
    ({
      filePath,
      data,
      localRev,
    }: {
      filePath: string;
      data: AppDataComplete;
      localRev: string | null;
    }): string | Error => {
      try {
        const dataStr = JSON.stringify(data);
        writeFileSync(filePath, dataStr);
        return getRev(filePath);
      } catch (e) {
        log('ERR: Sync error while writing to ' + filePath);
        error(e);
        return new Error(e as string);
      }
    },
  );

  answerRenderer(
    IPC.FILE_SYNC_GET_REV_AND_CLIENT_UPDATE,
    ({
      filePath,
      localRev,
    }: {
      filePath: string;
      localRev: string | null;
    }): { rev: string; clientUpdate?: number } | SyncGetRevResult => {
      try {
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

  answerRenderer(
    IPC.FILE_SYNC_LOAD,
    ({
      filePath,
      localRev,
    }: {
      filePath: string;
      localRev: string | null;
    }): { rev: string; data: AppDataComplete | undefined } | Error => {
      try {
        const data = readFileSync(filePath, { encoding: 'utf-8' });
        return {
          rev: getRev(filePath),
          data: JSON.parse(data) as AppDataComplete,
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
