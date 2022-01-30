import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';

// TODO make available for both
const getSendChannel = (channel: string): string => `%better-ipc-send-channel-${channel}`;

// TODO add all typing
export const answerRenderer = (
  browserWindowOrChannel: string,
  channelOrCallback: (returnVals: any, browserWindow?: BrowserWindow | null) => any,
  // callbackOrNothing?: unknown,
): (() => void) => {
  // let window: BrowserWindow = browserWindowOrChannel as any;
  const channel = browserWindowOrChannel;
  const callback = channelOrCallback;

  // let window: BrowserWindow;
  // let channel;
  // let callback: (arg1: any, arg2: any) => Promise<any>;
  // if (callbackOrNothing === undefined) {
  // channel = browserWindowOrChannel;
  // callback = channelOrCallback;
  // } else {
  //   window = browserWindowOrChannel as BrowserWindow;
  //   channel = channelOrCallback;
  //   callback = callbackOrNothing;
  //
  //   if (!window) {
  //     throw new Error('Browser window required');
  //   }
  // }

  const sendChannel = getSendChannel(channel);

  const listener = async (event: IpcMainEvent, data: any): Promise<void> => {
    const browserWindow: BrowserWindow | null = BrowserWindow.fromWebContents(
      event.sender,
    );

    if (window && (window as any).id !== browserWindow?.id) {
      return;
    }

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
