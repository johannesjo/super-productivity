import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import { IPC } from './shared-with-frontend/ipc-events.const';
import { warn } from 'electron-log/main';
import { GlobalConfigState } from '../src/app/features/config/global-config.model';

let cbs: ((settings: GlobalConfigState) => void)[] = [];
export const getSettings = (
  win: BrowserWindow,
  cbIN: (settings: GlobalConfigState) => void,
): void => {
  cbs.push(cbIN);
  win.webContents.send(IPC.TRANSFER_SETTINGS_REQUESTED);
};

ipcMain.on(IPC.TRANSFER_SETTINGS_TO_ELECTRON, getSettingsCb);

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function getSettingsCb(ev: IpcMainEvent, settings: GlobalConfigState): void {
  if (cbs.length) {
    cbs.forEach((cb) => cb(settings));
    cbs = [];
  } else {
    // NOTE: can happen, but is unlikely and unlikely to be a problem
    warn('getSettingsCb no callbacks left');
  }
}
