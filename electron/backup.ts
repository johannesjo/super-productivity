import { app, ipcMain } from 'electron';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { IPC } from './ipc-events.const';

let BACKUP_DIR = `${app.getPath('userData')}/backups`;

export function initBackupAdapter(backupDir: string) {
  BACKUP_DIR = backupDir;
  console.log('Saving backups to', BACKUP_DIR);

  ipcMain.on(IPC.BACKUP, backupData);
}

function backupData(ev, data) {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR);
  }
  const filePath = `${BACKUP_DIR}/${getDateStr()}.json`;

  try {
    const backup = JSON.stringify(data);
    writeFileSync(filePath, backup);
  } catch (e) {
    console.log('Error while backing up');
    console.error(e);
  }
}

function getDateStr(): string {
  const today = new Date();
  const dd = today.getDate();
  const mm = today.getMonth() + 1; // January is 0!
  const yyyy = today.getFullYear();

  const dds = (dd < 10)
    ? '0' + dd
    : dd.toString();
  const mms = (mm < 10)
    ? '0' + mm
    : mm.toString();
  return `${yyyy}-${mms}-${dds}`;
}
