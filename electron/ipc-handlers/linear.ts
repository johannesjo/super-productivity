import { ipcMain } from 'electron';
import { IPC } from '../shared-with-frontend/ipc-events.const';
import { sendLinearRequest } from '../linear';

export const initLinearIpc = (): void => {
  ipcMain.on(IPC.LINEAR_MAKE_REQUEST_EVENT, (ev, request) => {
    sendLinearRequest(request);
  });
};
