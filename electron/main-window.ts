import * as windowStateKeeper from 'electron-window-state';
import {BrowserWindow, dialog, ipcMain, Menu, MenuItemConstructorOptions, MessageBoxReturnValue, shell} from 'electron';
import {errorHandler} from './error-handler';
import {join, normalize} from 'path';
import {format} from 'url';
import {getSettings} from './get-settings';
import {IPC} from './ipc-events.const';

let mainWin;
let indicatorMod;

const mainWinModule = {
  win: undefined,
  isAppReady: false
};

export const getWin = () => {
  return mainWinModule.win;
};

export const getIsAppReady = () => {
  return mainWinModule.isAppReady;
};

export const createWindow = (params) => {
  // make sure the main window isn't already created
  if (mainWin) {
    errorHandler('Main window already exists');
    return;
  }

  const IS_DEV = params.IS_DEV;
  const ICONS_FOLDER = params.ICONS_FOLDER;
  const IS_MAC = params.IS_MAC;
  const quitApp = params.quitApp;
  const app = params.app;
  indicatorMod = params.indicatorMod;

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
    },
    icon: ICONS_FOLDER + '/icon_256x256.png'
  });

  mainWindowState.manage(mainWin);

  const url = (IS_DEV)
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
  // open new window links in browser
  mainWin.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    // needed for mac; especially for jira urls we might have a host like this www.host.de//
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname
      .replace('//', '/');
    const wellFormedUrl = urlObj.toString();
    const wasOpened = shell.openItem(wellFormedUrl);
    if (!wasOpened) {
      shell.openExternal(wellFormedUrl);
    }
  });

  // TODO refactor quiting mess

  const quitApp = () => {
    app.isQuiting = true;
    app.quit();
  };

  mainWin.on('close', (event) => {
      if (app.isQuiting) {
        app.quit();
      } else {
        event.preventDefault();

        getSettings(mainWin, (appCfg) => {
          if (appCfg && appCfg.misc.isConfirmBeforeExit && !app.isQuiting) {
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
                quitApp();
                return;
              }
            });
          } else {
            quitApp();
          }
        });
      }
    }
  );
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

