import { getWin } from './main-window';
import { IPC } from './shared-with-frontend/ipc-events.const';
import fetch, { RequestInit } from 'node-fetch';
import { error, log } from 'electron-log/main';

export const sendLinearRequest = ({
  requestId,
  requestInit,
  url,
}: {
  requestId: string;
  requestInit: RequestInit;
  url: string;
}): void => {
  const mainWin = getWin();

  fetch(url, requestInit as RequestInit)
    .then(async (response) => {
      if (!response.ok) {
        error('Linear Error Response ELECTRON: ', response);
        try {
          log(JSON.stringify(response));
        } catch (e) {}

        let errText;
        try {
          errText = await response.text();
        } catch (e2) {
          throw Error(response.statusText);
        }
        throw Error(errText || response.statusText);
      }
      return response;
    })
    .then((res) => res.text())
    .then((text) => {
      try {
        return text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('Error: Cannot parse json');
        console.log('Error: text response', text);
        return text;
      }
    })
    .then((response) => {
      mainWin.webContents.send(IPC.LINEAR_CB_EVENT, {
        response,
        requestId,
      });
    })
    .catch((err: unknown) => {
      mainWin.webContents.send(IPC.LINEAR_CB_EVENT, {
        error: err,
        requestId,
      });
    });
};
