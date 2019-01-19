import { ipcMain } from 'electron';
import { IPC_TRANSFER_SETTINGS_REQUESTED, IPC_TRANSFER_SETTINGS_TO_ELECTRON } from './ipc-events.const';

let cb;
export const getSettings = (win, cb_) => {
  cb = cb_;
  win.webContents.send(IPC_TRANSFER_SETTINGS_REQUESTED);
};

ipcMain.on(IPC_TRANSFER_SETTINGS_TO_ELECTRON, getSettingsCb);

function getSettingsCb(ev, settings) {
  cb(settings);
}
