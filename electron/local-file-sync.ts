import { answerRenderer } from './better-ipc';
import { IPC } from './ipc-events.const';
import { AppDataComplete, SyncGetRevResult } from '../src/app/imex/sync/sync.model';

export const initLocalFileSyncAdapter = (): void => {
  answerRenderer(
    IPC.FILE_SYNC_SAVE,
    (
      ev: any,
      {
        filePath,
        data,
        localRev,
      }: { filePath: string; data: AppDataComplete; localRev: string | null },
    ): string | Error => {
      // TODO kill existing watcher before and kill after
      console.log(ev);
      console.log(filePath, data, localRev);
      return undefined;
      // if (!existsSync(BACKUP_DIR)) {
      //   return false;
      // }
      // const files = readdirSync(BACKUP_DIR);
      // if (!files.length) {
      //   return false;
      // }
    },
  );

  answerRenderer(
    IPC.FILE_SYNC_GET_REV_AND_CLIENT_UPDATE,
    (
      ev: any,
      { filePath, localRev }: { filePath: string; localRev: string | null },
    ): { rev: string; clientUpdate?: number } | SyncGetRevResult => {
      console.log(ev);
      console.log(filePath, localRev);
      return undefined;
    },
  );

  answerRenderer(
    IPC.FILE_SYNC_LOAD,
    (
      ev: any,
      { filePath, localRev }: { filePath: string; localRev: string | null },
    ): { rev: string; data: AppDataComplete | undefined } => {
      console.log(ev);
      console.log(filePath, localRev);
      return undefined;
    },
  );
};
