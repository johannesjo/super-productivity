import * as windowStateKeeper from 'electron-window-state';
import {
  App,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  MessageBoxReturnValue,
  shell
} from 'electron';
import { errorHandler } from './error-handler';
import { join, normalize } from 'path';
import { format } from 'url';
import { IPC } from './ipc-events.const';
import { getSettings } from './get-settings';

let mainWin: BrowserWindow;

const mainWinModule: {
  win?: BrowserWindow;
  isAppReady: boolean;
} = {
  win: undefined,
  isAppReady: false
};

export const getWin = (): BrowserWindow => {
  if (!mainWinModule.win) {
    throw new Error('No main window');
  }
  return mainWinModule.win;
};

export const getIsAppReady = () => {
  return mainWinModule.isAppReady;
};

export const createWindow = ({
  IS_DEV,
  ICONS_FOLDER,
  IS_MAC,
  quitApp,
  app,
  customUrl,
}: {
  IS_DEV: boolean;
  ICONS_FOLDER: string;
  IS_MAC: boolean;
  quitApp: () => void;
  app: App;
  customUrl?: string;
}): BrowserWindow => {
  // make sure the main window isn't already created
  if (mainWin) {
    errorHandler('Main window already exists');
    return mainWin;
  }

  // workaround for https://github.com/electron/electron/issues/16521
  if (!IS_MAC) {
    Menu.setApplicationMenu(null);
  }

  const mainWindowState = windowStateKeeper({
    defaultWidth: 800,
    defaultHeight: 800
  });

  mainWin = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    titleBarStyle: IS_MAC ? 'hidden' : 'default',
    show: false,
    webPreferences: {
      scrollBounce: true,
      webSecurity: !IS_DEV,
      nodeIntegration: true,
      // NOTE: will be deprecated with v10
      enableRemoteModule: true
    },
    icon: ICONS_FOLDER + '/icon_256x256.png'
  });

  mainWindowState.manage(mainWin);

  const url = customUrl
    ? customUrl
    : (IS_DEV)
      ? 'http://localhost:4200'
      : format({
        pathname: normalize(join(__dirname, '../dist/index.html')),
        protocol: 'file:',
        slashes: true,
      });

  mainWin.loadURL(url);

  // show gracefully
  mainWin.once('ready-to-show', () => {
    mainWin.show();
  });

  initWinEventListeners(app);

  if (IS_MAC) {
    createMenu(quitApp);
  } else {
    mainWin.setMenu(null);
    mainWin.setMenuBarVisibility(false);
  }

  // update prop
  mainWinModule.win = mainWin;

  // listen for app ready
  ipcMain.on(IPC.APP_READY, () => {
    mainWinModule.isAppReady = true;
  });

  return mainWin;
};

function initWinEventListeners(app: any) {
  const handleRedirect = (event, url) => {
    event.preventDefault();
    // needed for mac; especially for jira urls we might have a host like this www.host.de//
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname
      .replace('//', '/');
    const wellFormedUrl = urlObj.toString();
    const wasOpened = shell.openExternal(wellFormedUrl);
    if (!wasOpened) {
      shell.openExternal(wellFormedUrl);
    }
  };

  // open new window links in browser
  mainWin.webContents.on('new-window', handleRedirect);
  mainWin.webContents.on('will-navigate', handleRedirect);

  // TODO refactor quiting mess
  appCloseHandler(app);
}

function createMenu(quitApp) {
  // Create application menu to enable copy & pasting on MacOS
  const menuTpl = [{
    label: 'Application',
    submenu: [
      {label: 'About Application', selector: 'orderFrontStandardAboutPanel:'},
      {type: 'separator'},
      {
        label: 'Quit', click: quitApp
      }
    ]
  }, {
    label: 'Edit',
    submenu: [
      {label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:'},
      {label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:'},
      {type: 'separator'},
      {label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:'},
      {label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:'},
      {label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:'},
      {label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:'}
    ]
  }
  ];
  const menuTplOUT = menuTpl as MenuItemConstructorOptions[];

  // we need to set a menu to get copy & paste working for mac os x
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTplOUT));
}

// TODO this is ugly as f+ck
const appCloseHandler = (
  app: App,
) => {
  let ids: string[] = [];

  const _quitApp = () => {
    (app as any).isQuiting = true;
    mainWin.close();
  };

  // ipcMain.on(IPC.APP_READY, () => isMainWinError = false);
  // ipcMain.on(IPC.ERROR, (ev, error) => {
  // HANDLED_ERROR_PROP_STR causes issues
  //   if (!error || !error[HANDLED_ERROR_PROP_STR]) {
  //     isMainWinError = true;
  //   }
  // });
  ipcMain.on(IPC.REGISTER_BEFORE_CLOSE, (ev, {id}) => {
    ids.push(id);
  });
  ipcMain.on(IPC.UNREGISTER_BEFORE_CLOSE, (ev, {id}) => {
    ids = ids.filter(idIn => idIn !== id);
  });
  ipcMain.on(IPC.BEFORE_CLOSE_DONE, (ev, {id}) => {
    ids = ids.filter(idIn => idIn !== id);
    console.log(IPC.BEFORE_CLOSE_DONE, id, ids);
    if (ids.length === 0) {
      _quitApp();
    }
  });

  mainWin.on('close', (event) => {
      // NOTE: this might not work if we run a second instance of the app
      console.log('close, isQuiting:', (app as any).isQuiting);
      if (!(app as any).isQuiting) {
        event.preventDefault();
        if (ids.length > 0) {
          console.log('Actions to wait for ', ids);
          mainWin.webContents.send(IPC.NOTIFY_ON_CLOSE, ids);
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
