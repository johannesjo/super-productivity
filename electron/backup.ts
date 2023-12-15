import { app, ipcMain, IpcMainEvent } from 'electron';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs';
import { IPC } from './shared-with-frontend/ipc-events.const';
import { LocalBackupMeta } from '../src/app/imex/local-backup/local-backup.model';
import * as path from 'path';
import { error, log } from 'electron-log/main';
import { AppDataComplete } from '../src/app/imex/sync/sync.model';

let BACKUP_DIR =
  `${app.getPath('userData')}` + process.platform == 'linux' ||
  process.platform === 'darwin'
    ? `/`
    : `\\` + `backups`;

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function initBackupAdapter(backupDir: string): void {
  BACKUP_DIR = backupDir;
  console.log('Saving backups to', BACKUP_DIR);
  log('Saving backups to', BACKUP_DIR);

  // BACKUP
  ipcMain.on(IPC.BACKUP, backupData);

  // IS_BACKUP_AVAILABLE
  ipcMain.handle(IPC.BACKUP_IS_AVAILABLE, (): LocalBackupMeta | false => {
    if (!existsSync(BACKUP_DIR)) {
      return false;
    }

    const files = readdirSync(BACKUP_DIR);
    if (!files.length) {
      return false;
    }
    const filesWithMeta: LocalBackupMeta[] = files.map(
      (fileName: string): LocalBackupMeta => ({
        name: fileName,
        path: path.join(BACKUP_DIR, fileName),
        folder: BACKUP_DIR,
        created: statSync(path.join(BACKUP_DIR, fileName)).mtime.getTime(),
      }),
    );

    filesWithMeta.sort((a: LocalBackupMeta, b: LocalBackupMeta) => a.created - b.created);
    log(
      'Avilable Backup Files: ',
      filesWithMeta?.map && filesWithMeta.map((f) => f.path),
    );
    return filesWithMeta.reverse()[0];
  });

  // RESTORE_BACKUP
  ipcMain.handle(IPC.BACKUP_LOAD_DATA, (ev, backupPath: string): string => {
    log('Reading backup file: ', backupPath);
    return readFileSync(backupPath, { encoding: 'utf8' });
  });
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function backupData(ev: IpcMainEvent, data: AppDataComplete): void {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR);
  }
  const filePath = `${BACKUP_DIR}/${getDateStr()}.json`;

  try {
    const backup = JSON.stringify(data);
    writeFileSync(filePath, backup);
  } catch (e) {
    log('Error while backing up');
    error(e);
  }
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function getDateStr(): string {
  const today = new Date();
  const dd = today.getDate();
  const mm = today.getMonth() + 1; // January is 0!
  const yyyy = today.getFullYear();

  const dds = dd < 10 ? '0' + dd : dd.toString();
  const mms = mm < 10 ? '0' + mm : mm.toString();
  return `${yyyy}-${mms}-${dds}`;
}
