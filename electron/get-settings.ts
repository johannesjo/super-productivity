import { ipcMain } from 'electron';

let cb;
export const getSettings = (win, cb_) => {
  cb = cb_;
  win.webContents.send('TRANSFER_SETTINGS_REQUESTED');
};

ipcMain.on('TRANSFER_SETTINGS_TO_ELECTRON', getSettingsCb);

function getSettingsCb(ev, settings) {
  cb(settings);
}
