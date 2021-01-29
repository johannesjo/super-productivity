import { google } from 'googleapis';
import { ipcMain } from 'electron';
import { getWin } from './main-window';
import { IPC } from './ipc-events.const';
import * as fs from 'fs';
import { answerRenderer } from './better-ipc';
import * as querystring from 'querystring';

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

/**
 * Create a new OAuth2 client with the configured keys.
 */
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);
const TOKEN_PATH = 'google-token.json';

google.options({auth: oauth2Client});

async function authenticate(authCode) {
  return new Promise((resolve, reject) => {
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, savedToken) => {
      if (!err) {
        oauth2Client.setCredentials(JSON.parse(savedToken.toString()));
        resolve(savedToken);
      } else {
        return getAccessToken(authCode).then((token) => {
          oauth2Client.setCredentials(token);
          fs.writeFile(TOKEN_PATH, JSON.stringify(token), (errI) => {
            if (errI) {
              console.error(errI);
              return reject(err);
            }
            console.log('Token stored to', TOKEN_PATH);
          });
        });
      }
    });
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 */
function getAccessToken(authCode) {
  return new Promise((resolve, reject) => {
    oauth2Client.getToken(authCode, (err, token) => {
      if (err) {
        console.error('Error retrieving access token', err);
        reject(err);
      }
      // Store the token to disk for later program executions
      resolve(token);
    });
  });
}

export const initGoogleAuth = () => {
  ipcMain.on(IPC.TRIGGER_GOOGLE_AUTH, (ev, authCode) => {
    console.log('authCode', (authCode && authCode.length));
    const mainWin = getWin();
    authenticate(authCode).then((res: any) => {
      mainWin.webContents.send(IPC.GOOGLE_AUTH_TOKEN, res);
    }).catch((err) => {
      mainWin.webContents.send(IPC.GOOGLE_AUTH_TOKEN_ERROR);
      console.log('error');
      console.log(err);
    });
  });

  answerRenderer(IPC.GOOGLE_AUTH_GET_AUTH_URL, (): string => {
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
  });
};

function generateAuthUrl(opts = {}) {
  // @ts-ignore
  if (opts.code_challenge_method && !opts.code_challenge) {
    throw new Error('If a code_challenge_method is provided, code_challenge must be included.');
  }
  // @ts-ignore
  opts.response_type = opts.response_type || 'code';
  // @ts-ignore
  opts.client_id = opts.client_id || CLIENT_ID;
  // @ts-ignore
  opts.redirect_uri = opts.redirect_uri || 'urn:ietf:wg:oauth:2.0:oob';
  // Allow scopes to be passed either as array or a string
  // @ts-ignore
  if (opts.scope instanceof Array) {
    // @ts-ignore
    opts.scope = opts.scope.join(' ');
  }
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  return rootUrl + '?' + querystring.stringify(opts);
}

let url;

url = generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
});
console.log(url);

// url = generateAuthUrl({
//   access_type: 'offline',
//   scope: SCOPES,
//   redirect_uri: 'https://app.super-productivity.com/'
// });
// console.log(url);
//
// url = generateAuthUrl({
//   access_type: 'offline',
//   scope: SCOPES,
//   redirect_uri: 'https://super-productivity.com/'
// });
// console.log(url);
//
// url = generateAuthUrl({
//   access_type: 'offline',
//   scope: SCOPES,
//   redirect_uri: 'postmessage'
// });
// console.log(url);
//
