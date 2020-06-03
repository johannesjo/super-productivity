import {App, BrowserWindow, dialog, ipcMain, MessageBoxReturnValue} from 'electron';
import {getSettings} from './get-settings';
import {IPC} from './ipc-events.const';
import {HANDLED_ERROR_PROP_STR} from '../src/app/app.constants';

// TODO this is ugly as f+ck
export const appCloseHandler = (
  app: App,
  mainWin: BrowserWindow,
) => {
  let isMainWinError = false;
  let ids = [];

  const _quitApp = () => {
    (app as any).isQuiting = true;
    app.quit();
  };

  ipcMain.on(IPC.APP_READY, () => isMainWinError = false);
  ipcMain.on(IPC.ERROR, (ev, error) => {
    if (!error || !error[HANDLED_ERROR_PROP_STR]) {
      isMainWinError = true;
      ids = [];
    }
  });
  ipcMain.on(IPC.REGISTER_BEFORE_CLOSE, (ev, {id}) => {
    ids.push(id);
  });
  ipcMain.on(IPC.UNREGISTER_BEFORE_CLOSE, (ev, {id}) => {
    ids.filter(idIn => idIn !== id);
  });
  ipcMain.on(IPC.BEFORE_CLOSE_DONE, (ev, {id}) => {
    ids.filter(idIn => idIn !== id);
    if (ids.length === 0) {
      app.quit();
    }
  });


  mainWin.on('close', (event) => {
      if ((app as any).isQuiting) {
        app.quit();
      } else {
        event.preventDefault();
        if (ids.length > 0) {
          mainWin.webContents.send(IPC.NOTIFY_ON_CLOSE);
        } else {
          getSettings(mainWin, (appCfg) => {
            if (appCfg && appCfg.misc.isConfirmBeforeExit && !(app as any).isQuiting) {
              dialog.showMessageBox(mainWin,
                {
                  type: 'question',
                  buttons: ['Yes', 'No'],
                  title: 'Confirm',
                  message: 'Are you sure you want to quit?'
                }).then((choice: MessageBoxReturnValue) => {
                if (choice.response === 1) {
                  return;
                } else if (choice.response === 0) {
                  _quitApp();
                  return;
                }
              });
            } else {
              _quitApp();
            }
          });
        }
      }
    }
  );
};
