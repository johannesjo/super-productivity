const electronGoogleOauth = require('electron-google-oauth');
const electron = require('electron');
const mainWinMod = require('./main-window');

const A = {
  CLIENT_ID: '37646582031-e281jj291amtk805td0hgfqss2jfkdcd.apps.googleusercontent.com',
  API_KEY: 'AIzaSyBqr3r5B5QGb_drLTK8_q9HW7YUez83Bik',
  EL_CLIENT_ID: '37646582031-qo0kc0p6amaukfd5ub16hhp6f8smrk1n.apps.googleusercontent.com',
  EL_API_KEY: 'Er6sAwgXCDKPgw7y8jSuQQTv',
  DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets.readonly' +
  ' https://www.googleapis.com/auth/drive'
};

let mainWin;
const clientId = A.EL_CLIENT_ID;
const clientSecret = A.EL_API_KEY;

electron.ipcMain.on('TRIGGER_GOOGLE_AUTH', () => {
  console.log('TRIGGER_GOOGLE_AUTH');

  const browserWindowParams = {
    center: true,
    show: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false
    }
  };

  const googleOauth = electronGoogleOauth(browserWindowParams);
  console.log(googleOauth);

  googleOauth.getAccessToken(
    ['https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive'],
    clientId,
    clientSecret
  ).then((token) => {
    mainWin.webContents.send('GOOGLE_AUTH_TOKEN', token);
  }).catch((err) => {
    mainWin.webContents.send('GOOGLE_AUTH_TOKEN_ERROR');
    console.log(err);
  })
});

module.exports = (mw) => {
  mainWin = mw;
};