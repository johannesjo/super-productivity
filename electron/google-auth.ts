import { google } from 'googleapis';
import { BrowserWindow, BrowserWindowConstructorOptions, ipcMain } from 'electron';
import { getWin } from './main-window';
import { IPC } from './ipc-events.const';

const A = {
  CLIENT_ID: '37646582031-e281jj291amtk805td0hgfqss2jfkdcd.apps.googleusercontent.com',
  API_KEY: 'AIzaSyBqr3r5B5QGb_drLTK8_q9HW7YUez83Bik',
  EL_CLIENT_ID: '37646582031-qo0kc0p6amaukfd5ub16hhp6f8smrk1n.apps.googleusercontent.com',
  EL_API_KEY: 'Er6sAwgXCDKPgw7y8jSuQQTv',
  DISCOVERY_DOCS: [],
  // NOTE: separate by space if multiple
  SCOPES: 'https://www.googleapis.com/auth/drive'
};

const CLIENT_ID = A.EL_CLIENT_ID;
const CLIENT_SECRET = A.EL_API_KEY;
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.install',
];

const POPUP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36';
const BROWSER_WINDOW_PARAMS: BrowserWindowConstructorOptions = {
  center: true,
  show: true,
  resizable: false,
  webPreferences: {
    nodeIntegration: false,
  },
};

/**
 * Create a new OAuth2 client with the configured keys.
 */
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

google.options({auth: oauth2Client});

async function authenticate(refreshToken) {
  return new Promise((resolve, reject) => {
    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES.join(' ')
    });

    const freshAuth = () => {
      // open the browser window to the authorize url to start the workflow
      openAuthWindow(authorizeUrl)
        .then((code: any) => {
          oauth2Client.getToken(code)
            .then((res) => resolve(res.tokens))
            .catch(reject);
        })
        .catch(reject);
    };

    // grab the url that will be used for authorization
    if (refreshToken) {
      // console.log('SETTING REFRESH TOKEN', refreshToken);
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
      oauth2Client.getAccessToken()
        .then((res) => {
          if (!res || !res.res) {
            reject(res);
          }
          // console.log('TOKEN REFRESH ', res.res.data);
          resolve((res.res as any).data);
        })
        .catch((err) => {
          console.log(err);
          freshAuth();
        });
    } else {
      freshAuth();
    }
  });
}

function openAuthWindow(url) {
  return new Promise((resolve, reject) => {
    /* tslint:disable-next-line */
    const win = new BrowserWindow(BROWSER_WINDOW_PARAMS);

    win.loadURL(url, {userAgent: POPUP_USER_AGENT});

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

export const initGoogleAuth = () => {
  ipcMain.on(IPC.TRIGGER_GOOGLE_AUTH, (ev, refreshToken) => {
    console.log('refreshToken', (refreshToken && refreshToken.length));
    const mainWin = getWin();
    authenticate(refreshToken).then((res: any) => {
      mainWin.webContents.send(IPC.GOOGLE_AUTH_TOKEN, res);
    }).catch((err) => {
      mainWin.webContents.send(IPC.GOOGLE_AUTH_TOKEN_ERROR);
      console.log('error');
      console.log(err);
    });
  });
};

