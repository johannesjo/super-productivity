import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';

// TODO make available for both
const getSendChannel = (channel: string): string => `%better-ipc-send-channel-${channel}`;

// TODO add all typing
export const answerRenderer = (
  channel: string,
  channelOrCallback: (returnVals: any, browserWindow?: BrowserWindow | null) => any,
): (() => void) => {
  const callback = channelOrCallback;

  const sendChannel = getSendChannel(channel);

  const listener = async (event: IpcMainEvent, data: any): Promise<void> => {
    const browserWindow: BrowserWindow | null = BrowserWindow.fromWebContents(
      event.sender,
    );

    const send = (channelI: string, dataI: any): void => {
      if (!(browserWindow && browserWindow.isDestroyed())) {
        event.sender.send(channelI, dataI);
      }
    };

    const { dataChannel, errorChannel, userData } = data;

    try {
      send(dataChannel, await callback(userData, browserWindow));
    } catch (error) {
      // send(errorChannel, serializeError(error));
      send(errorChannel, error);
    }
  };

  ipcMain.on(sendChannel, listener);

  return (): void => {
    ipcMain.off(sendChannel, listener);
  };
};
