import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';

// TODO make available for both
const getSendChannel = (channel: string): string => `%better-ipc-send-channel-${channel}`;

// TODO add all typing
export const answerRenderer = (
  browserWindowOrChannel,
  channelOrCallback,
  callbackOrNothing?,
): (() => void) => {
  let window;
  let channel;
  let callback;

  if (callbackOrNothing === undefined) {
    channel = browserWindowOrChannel;
    callback = channelOrCallback;
  } else {
    window = browserWindowOrChannel;
    channel = channelOrCallback;
    callback = callbackOrNothing;

    if (!window) {
      throw new Error('Browser window required');
    }
  }

  const sendChannel = getSendChannel(channel);

  const listener = async (event: IpcMainEvent, data): Promise<void> => {
    const browserWindow: BrowserWindow | null = BrowserWindow.fromWebContents(
      event.sender,
    );

    if (window && window.id !== browserWindow?.id) {
      return;
    }

    const send = (channelI, dataI): void => {
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
