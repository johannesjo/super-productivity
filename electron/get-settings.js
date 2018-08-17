const electron = require('electron');

let cb;
module.exports = (win, cb_) => {
  cb = cb_;
  win.webContents.send('TRANSFER_SETTINGS_REQUESTED');
};

electron.ipcMain.on('TRANSFER_SETTINGS_TO_ELECTRON', getSettingsCb);

function getSettingsCb(ev, settings) {
  cb(settings);
}
