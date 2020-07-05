import { ipcMain } from 'electron';
import { IPC } from './ipc-events.const';

let cb;
export const getSettings = (win, cbIN) => {
  cb = cbIN;
  win.webContents.send(IPC.TRANSFER_SETTINGS_REQUESTED);
};

ipcMain.on(IPC.TRANSFER_SETTINGS_TO_ELECTRON, getSettingsCb);

function getSettingsCb(ev, settings) {
  cb(settings);
}
