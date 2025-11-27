import { app, ipcMain, ProgressBarOptions } from 'electron';
import { IPC } from '../shared-with-frontend/ipc-events.const';
import { getWin } from '../main-window';
import { quitApp, showOrFocus } from '../various-shared';
import { getIsLocked } from '../shared-state';
import { lockscreen } from '../lockscreen';
import { errorHandlerWithFrontendInform } from '../error-handler-with-frontend-inform';

export const initAppControlIpc = (): void => {
  ipcMain.on(IPC.SHUTDOWN_NOW, quitApp);
  ipcMain.on(IPC.EXIT, (ev, exitCode: number) => app.exit(exitCode));
  ipcMain.on(IPC.RELAUNCH, () => app.relaunch());
  ipcMain.on(IPC.OPEN_DEV_TOOLS, () => getWin().webContents.openDevTools());
  ipcMain.on(IPC.RELOAD_MAIN_WIN, () => getWin().reload());

  ipcMain.on(IPC.SHOW_OR_FOCUS, () => {
    const mainWin = getWin();
    showOrFocus(mainWin);
  });

  ipcMain.on(IPC.LOCK_SCREEN, () => {
    if (getIsLocked()) {
      return;
    }

    try {
      lockscreen();
    } catch (e) {
      errorHandlerWithFrontendInform(e);
    }
  });

  ipcMain.on(IPC.SET_PROGRESS_BAR, (ev, { progress, progressBarMode }) => {
    const mainWin = getWin();
    if (mainWin) {
      if (progressBarMode === 'none') {
        mainWin.setProgressBar(-1);
      } else {
        mainWin.setProgressBar(Math.min(Math.max(progress, 0), 1), {
          mode: progressBarMode as ProgressBarOptions['mode'],
        });
      }
    }
  });

  ipcMain.on(IPC.FLASH_FRAME, (ev) => {
    const mainWin = getWin();
    if (mainWin) {
      mainWin.flashFrame(false);
      mainWin.flashFrame(true);

      mainWin.once('focus', () => {
        mainWin.flashFrame(false);
      });
    }
  });
};
