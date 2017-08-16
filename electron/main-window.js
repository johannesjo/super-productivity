const electron = require('electron');
const BrowserWindow = electron.BrowserWindow;
const path = require('path');
const url = require('url');
const open = require('open');
let mainWin;


function createWindow(params) {
  const IS_DEV = params.IS_DEV;
  const ICONS_FOLDER = params.ICONS_FOLDER;
  const IS_MAC = params.IS_MAC;
  const quitApp = params.quitApp;
  const app = params.app;
  const nestedWinParams = params.nestedWinParams;

  let frontendDir;

  if (IS_DEV) {
    frontendDir = 'app-src';
  } else {
    frontendDir = 'app';
  }

  // Create the browser window.
  mainWin = new BrowserWindow({ width: 800, height: 600 });

  // and load the index.html of the app.
  mainWin.loadURL(url.format({
    pathname: path.join(__dirname, '../' + frontendDir + '/index.html'),
    protocol: 'file:',
    slashes: true,
    webPreferences: {
      scrollBounce: true
    },
    icon: ICONS_FOLDER + '/app-icons/icon_256x256.png'
  }));

  // Open the DevTools.
  //mainWin.webContents.openDevTools();

  initWinEventListeners(app, IS_MAC, nestedWinParams);

  if (IS_MAC) {
    createMenu(quitApp);
  }

  return mainWin;
}

function initWinEventListeners(app, IS_MAC, nestedWinParams) {
  // open new window links in browser
  mainWin.webContents.on('new-window', function (event, url) {
    event.preventDefault();
    open(url);
  });

  mainWin.on('close', function (event) {
    // handle darwin
    if (IS_MAC) {
      if (!nestedWinParams.isDarwinForceQuit) {
        event.preventDefault();
        mainWin.hide();
      }
    } else {
      if (!app.isQuiting) {
        event.preventDefault();
        mainWin.hide();
      }
    }
  });

  mainWin.on('minimize', function (event) {
    event.preventDefault();
    mainWin.hide();
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

module.exports = {
  createWindow,
};