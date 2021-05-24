import { ipcMain } from 'electron';
import { IPC } from './ipc-events.const';
import { warn } from 'electron-log';

let cbs = [];
export const getSettings = (win, cbIN) => {
  cbs.push(cbIN);
  win.webContents.send(IPC.TRANSFER_SETTINGS_REQUESTED);
};

ipcMain.on(IPC.TRANSFER_SETTINGS_TO_ELECTRON, getSettingsCb);

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function getSettingsCb(ev, settings) {
  if (cbs.length) {
    cbs.forEach((cb) => cb(settings));
    cbs = [];
  } else {
    // NOTE: can happen, but is unlikely and unlikely to be a problem
    warn('getSettingsCb no callbacks left');
  }
}
