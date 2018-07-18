const http = require('http');
const url = require('url');
const querystring = require('querystring');
const opn = require('opn');
const destroyer = require('server-destroy');

const {google} = require('googleapis');
const electron = require('electron');
const mainWinMod = require('./main-window');
const {BrowserWindow} = require('electron');

const A = {
  CLIENT_ID: '37646582031-e281jj291amtk805td0hgfqss2jfkdcd.apps.googleusercontent.com',
  API_KEY: 'AIzaSyBqr3r5B5QGb_drLTK8_q9HW7YUez83Bik',
  EL_CLIENT_ID: '37646582031-qo0kc0p6amaukfd5ub16hhp6f8smrk1n.apps.googleusercontent.com',
  EL_API_KEY: 'Er6sAwgXCDKPgw7y8jSuQQTv',
  DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets.readonly' +
  ' https://www.googleapis.com/auth/drive'
};

const clientId = A.EL_CLIENT_ID;
const clientSecret = A.EL_API_KEY;
const scopes = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/spreadsheets.readonly'
];


/**
 * Create a new OAuth2 client with the configured keys.
 */
const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  'urn:ietf:wg:oauth:2.0:oob'
);

/**
 * This is one of the many ways you can configure googleapis to use authentication credentials.  In this method, we're setting a global reference for all APIs.  Any other API you use here, like google.drive('v3'), will now use this auth client. You can also override the auth client at the service and method call levels.
 */
google.options({auth: oauth2Client});

async function authenticate(refreshToken) {
  return new Promise((resolve, reject) => {
    // grab the url that will be used for authorization
    if (refreshToken) {
      console.log('SETTING REFRESH TOKEN', refreshToken);
      oauth2Client.setCredentials({
        refresh_token: `STORED_REFRESH_TOKEN`
      });
      oauth2Client.refreshToken(refreshToken)
        .then(resolve)
        .catch(reject)
    } else {
      const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes.join(' ')
      });

      // open the browser window to the authorize url to start the workflow
      openAuthWindow(authorizeUrl)
        .then((code) => {
          oauth2Client.getToken(code)
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    }
  });
}

function openAuthWindow(url) {
  const browserWindowParams = {
    center: true,
    show: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false
    }
  };

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow(browserWindowParams || {'use-content-size': true});

    win.loadURL(url);

    win.on('closed', () => {
      reject(new Error('User closed the window'));
    });

    win.on('page-title-updated', () => {
      setImmediate(() => {
        const title = win.getTitle();
        if (title.startsWith('Denied')) {
          reject(new Error(title.split(/[ =]/)[2]));
          win.removeAllListeners('closed');
          win.close();
        } else if (title.startsWith('Success')) {
          console.log(title);

          resolve(title.split(/[ =]/)[2]);
          win.removeAllListeners('closed');
          win.close();
        }
      });
    });
  });
}

// oauth2Client.on('tokens', (tokens) => {
//   console.log('TOKENS');
//   if (tokens.refresh_token) {
//     // store the refresh_token in my database!
//     console.log(tokens.refresh_token);
//   }
//   console.log(tokens.access_token);
// });

module.exports = {
  init: function() {
    electron.ipcMain.on('TRIGGER_GOOGLE_AUTH', (ev, refreshToken) => {
      console.log('TRIGGER_GOOGLE_AUTH, rt', refreshToken);
      const mainWin = mainWinMod.getWin();
      authenticate(refreshToken).then((res) => {
        mainWin.webContents.send('GOOGLE_AUTH_TOKEN', res.tokens);
      }).catch((err) => {
        mainWin.webContents.send('GOOGLE_AUTH_TOKEN_ERROR');
        console.log(err);
      })
    });
  }
};
