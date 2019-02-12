import { BrowserWindow, ipcMain, Menu, shell } from 'electron';
import { errorHandler } from './error-handler';
import { join, normalize } from 'path';
import { format } from 'url';
import { getSettings } from './get-settings';
import { IPC_APP_READY } from './ipc-events.const';
import MenuItemConstructorOptions = Electron.MenuItemConstructorOptions;

let mainWin;
let indicatorMod;

const mainWinModule = {
  win: undefined,
  isAppReady: false
};

export const getWin = function () {
  return mainWinModule.win;
};

export const getIsAppReady = function () {
  return mainWinModule.isAppReady;
};

export const createWindow = function (params) {
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
  const nestedWinParams = params.nestedWinParams;
  indicatorMod = params.indicatorMod;
  mainWin = new BrowserWindow({width: 800, height: 800, titleBarStyle: 'hiddenInset'});

  if (IS_DEV) {
    // TODO check
    // require('electron-reload')(__dirname, {
    //   electron: require(`${__dirname}/../node_modules/electron`)
    // });
    mainWin.loadURL('http://localhost:4200');
  } else {
    const url = format({
      pathname: normalize(join(__dirname, '../dist/index.html')),
      protocol: 'file:',
      slashes: true,
    });
    mainWin.loadURL(url, {
      show: false,
      webPreferences: {
        scrollBounce: true
      },
      titleBarStyle: 'hiddenInset',
      icon: ICONS_FOLDER + '/icon_256x256.png'
    });
    // mainWin.webContents.openDevTools();
  }
  // show gracefully
  mainWin.once('ready-to-show', () => {
    mainWin.show();
  });

  initWinEventListeners(app);

  if (IS_MAC) {
    createMenu(quitApp);
  } else {
    mainWin.setMenu(null);
  }

  // update prop
  mainWinModule.win = mainWin;

  // listen for app ready
  ipcMain.on(IPC_APP_READY, () => {
    mainWinModule.isAppReady = true;
  });

  return mainWin;
};

function initWinEventListeners(app: any) {
  // open new window links in browser
  mainWin.webContents.on('new-window', function (event, url) {
    event.preventDefault();
    shell.openItem(url);
  });

  let isQuiting = false;

  // TODO refactor quiting mess

  mainWin.on('close', function (event) {
      if (isQuiting) {
        app.quit();
      } else {
        event.preventDefault();

        getSettings(mainWin, (appCfg) => {
          if (appCfg && appCfg.misc.isConfirmBeforeExit && !app.isQuiting) {
            const choice = require('electron').dialog.showMessageBox(mainWin,
              {
                type: 'question',
                buttons: ['Yes', 'No'],
                title: 'Confirm',
                message: 'Are you sure you want to quit?'
              });
            if (choice === 1) {
              event.preventDefault();
              return;
            } else if (choice === 0) {
              app.isQuiting = true;
              isQuiting = true;
              app.quit();
              return;
            }
          } else {
            app.isQuiting = true;
            isQuiting = true;
            app.quit();
          }
        });
      }
    }
  );

  mainWin.webContents.on('new-window', (e, url) => {
    e.preventDefault();
    e.stopPropagation();
    shell.openExternal(url);
  });
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
  const menuTpl_ = menuTpl as MenuItemConstructorOptions[];

  // we need to set a menu to get copy & paste working for mac os x
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTpl_));
}

