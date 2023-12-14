import { Injectable } from '@angular/core';
// If you import a module but never use any of the imported values other than as TypeScript types,
// the resulting javascript file will look as if you never imported the module at all.
import { ipcRenderer } from 'electron';
import { IS_ELECTRON } from '../../app.constants';
import { getElectronRemoteModule } from '../../util/get-electron-remote-module';
import * as remote from '@electron/remote';

// TODO make available for both
export const getSendChannel = (channel: string): string =>
  `%better-ipc-send-channel-${channel}`;
const getUniqueId = (): string => `${Date.now()}-${Math.random()}`;

// const getRendererSendChannel = (windowId, channel) => `%better-ipc-send-channel-${windowId}-${channel}`;
const getResponseChannels = (
  channel: string,
): {
  sendChannel: string;
  dataChannel: string;
  errorChannel: string;
} => {
  const id = getUniqueId();
  return {
    sendChannel: getSendChannel(channel),
    dataChannel: `%better-ipc-response-data-channel-${channel}-${id}`,
    errorChannel: `%better-ipc-response-error-channel-${channel}-${id}`,
  };
};

@Injectable({ providedIn: 'root' })
export class ElectronService {
  private ipcRenderer?: typeof ipcRenderer;

  // fs: typeof fs;

  constructor() {
    // Conditional imports
    if (IS_ELECTRON) {
      // this.ipcRenderer = electron.ipcRenderer;
      this.ipcRenderer = window.electronAPI.ipcRenderer();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    }
  }

  public callMain(channel: string, data: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const { sendChannel, dataChannel, errorChannel } = getResponseChannels(channel);

      const cleanup = (): void => {
        (this.ipcRenderer as typeof ipcRenderer).off(dataChannel, onData);
        (this.ipcRenderer as typeof ipcRenderer).off(errorChannel, onError);
      };

      const onData = (event: unknown, result: unknown): void => {
        cleanup();
        resolve(result);
      };

      const onError = (event: unknown, error: unknown): void => {
        cleanup();
        // reject(deserializeError(error));
        reject(error);
      };

      (this.ipcRenderer as typeof ipcRenderer).once(dataChannel, onData);
      (this.ipcRenderer as typeof ipcRenderer).once(errorChannel, onError);

      const completeData = {
        dataChannel,
        errorChannel,
        userData: data,
      };

      (this.ipcRenderer as typeof ipcRenderer).send(sendChannel, completeData);
    });
  }
}
