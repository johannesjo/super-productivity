import { BrowserWindow, ipcMain } from 'electron';
import { IPC } from './shared-with-frontend/ipc-events.const';
import { TakeABreakConfig } from '../src/app/features/config/global-config.model';
import { format } from 'url';
import { join, normalize } from 'path';

export const initFullScreenBlocker = (IS_DEV: boolean): void => {
  let isFullScreenWindowOpen = false;
  ipcMain.on(
    IPC.FULL_SCREEN_BLOCKER,
    (
      ev,
      { msg, takeABreakCfg }: { msg: string; takeABreakCfg: TakeABreakConfig },
    ): void => {
      if (isFullScreenWindowOpen) {
        return;
      }
      const win = new BrowserWindow({
        title: msg,
        fullscreen: true,
        alwaysOnTop: true,
        transparent: true,
      });
      const randomImgUrl = takeABreakCfg.motivationalImgs.length
        ? takeABreakCfg.motivationalImgs[
            Math.floor(Math.random() * takeABreakCfg.motivationalImgs.length)
          ]
        : '';

      win.setAlwaysOnTop(true, 'floating');
      win.setVisibleOnAllWorkspaces(true);
      win.setFullScreenable(false);
      isFullScreenWindowOpen = true;
      win.loadURL(
        format({
          pathname: normalize(
            join(
              __dirname,
              IS_DEV
                ? '../src/static/break-reminder-overlay.html'
                : '../dist/static/break-reminder-overlay.html',
            ),
          ),
          protocol: 'file:',
          slashes: true,
        }) +
          `#msg=${encodeURI(msg)}&img=${encodeURI(randomImgUrl)}&time=${
            takeABreakCfg.timedFullScreenBlockerDuration
          }`,
      );

      const closeTimeout = setTimeout(() => {
        win.close();
      }, takeABreakCfg.timedFullScreenBlockerDuration || 5000);
      win.on('close', () => {
        if (closeTimeout) {
          clearTimeout(closeTimeout);
        }
        isFullScreenWindowOpen = false;
      });
      // prevent closing via alt f4 and all other keys
      win.webContents.on('before-input-event', (event, input) => {
        event.preventDefault();
        // if (input.code == 'F4' && input.alt) event.preventDefault();
      });
    },
  );
};
