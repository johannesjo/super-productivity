const electron = require('electron');
const getSettings = require('./get-settings');
const errorHandler = require('./error-handler');
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const url = require('url');
let mainWin;
let indicatorMod;

const mainWinModule = module.exports = {
  createWindow,
  getWin,
  getIsAppReady,
  win: undefined,
  isAppReady: false
};

function getWin() {
  return mainWinModule.win;
}

function getIsAppReady() {
  return mainWinModule.isAppReady;
}

function createWindow(params) {
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

  if (IS_DEV) {
    mainWin = new BrowserWindow({ width: 800, height: 800 });
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/../node_modules/electron`)
    });
    mainWin.loadURL('http://localhost:4200');
  } else {
    mainWin = new BrowserWindow({ width: 800, height: 600 });
    mainWin.loadURL(url.format({
      pathname: path.join(__dirname, '../dist/index.html'),
      protocol: 'file:',
      slashes: true,
      webPreferences: {
        scrollBounce: true
      },
      icon: ICONS_FOLDER + '/app-icons/icon_256x256.png'
    }));
    // mainWin.webContents.openDevTools();
  }

  initWinEventListeners(app, IS_MAC, nestedWinParams, indicatorMod);

  if (IS_MAC) {
    createMenu(quitApp);
  } else {
    mainWin.setMenu(null);
  }

  // update prop
  mainWinModule.win = mainWin;

  // listen for app ready
  const APP_READY = 'APP_READY';
  electron.ipcMain.on(APP_READY, () => {
    mainWinModule.isAppReady = true;
  });

  return mainWin;
}

function initWinEventListeners(app, IS_MAC, nestedWinParams) {
  // open new window links in browser
  mainWin.webContents.on('new-window', function(event, url) {
    event.preventDefault();
    electron.shell.openItem(url);
  });

  mainWin.on('close', function(event) {
    if (app.isQuiting) {
      app.quit();
    } else {
      event.preventDefault();

      getSettings(mainWin, (appCfg) => {
        if (appCfg && appCfg.misc.isConfirmBeforeExit) {
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
          }
        }

        if (!appCfg || !appCfg.misc.isMinimizeToTrayOnExit) {
          app.isQuiting = true;
          app.quit();
        } else {
          // handle darwin
          if (IS_MAC) {
            if (nestedWinParams.isDarwinForceQuit) {
              app.isQuiting = true;
              app.quit();
            } else {
              event.preventDefault();
              mainWin.hide();
            }
          } else {
            if (indicatorMod.isRunning()) {
              event.preventDefault();
              mainWin.hide();
            } else {
              app.isQuiting = true;
              app.quit();
            }
          }
        }
      });
    }
  });
}

function createMenu(quitApp) {
  // Create application menu to enable copy & pasting on MacOS
  const menuTpl = [{
    label: 'Application',
    submenu: [
      { label: 'About Application', selector: 'orderFrontStandardAboutPanel:' },
      { type: 'separator' },
      {
        label: 'Quit', click: quitApp
      }
    ]
  }, {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' }
    ]
  }
  ];

  // we need to set a menu to get copy & paste working for mac os x
  electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(menuTpl));
}

