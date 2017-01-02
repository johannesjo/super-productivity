'use strict';

const electron = require('electron');
const powerSaveBlocker = require('electron').powerSaveBlocker;
const moment = require('moment');

powerSaveBlocker.start('prevent-app-suspension');

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
const PING_INTERVAL = 1000;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let lsData;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({ width: 800, height: 600 });

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, '../app/index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('minimize', function (event) {
    event.preventDefault();
    mainWindow.hide();
  });

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let appIcon = null;
app.on('ready', () => {
  appIcon = new electron.Tray('electron/ico.png');
  let contextMenu = electron.Menu.buildFromTemplate([
    {
      label: 'Show App', click: () => {
      mainWindow.show();
    }
    },
    {
      label: 'Quit', click: () => {
      app.isQuiting = true;
      app.quit();
    }
    }
  ]);
  appIcon.setContextMenu(contextMenu);
  appIcon.setToolTip('This is my application.');
  appIcon.setTitle('test');

  // Call this again for Linux because we modified the context menu
  appIcon.setContextMenu(contextMenu)
});

app.on('ready', () => {
  // Register a 'CommandOrControl+X' shortcut listener.
  const ret = electron.globalShortcut.register('CommandOrControl+Shift+X', () => {
    mainWindow.show();
  });

  if (!ret) {
    console.log('registration failed');
  }
});

app.on('activate', function () {
  global.tasksData = {};
  global.test = { 'TEST': 'AAAA' };

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('ready', () => {
  setInterval(trackTimeFn, PING_INTERVAL);
});

electron.ipcMain.on('LS_UPDATE', (ev, lsDataArg) => {
  lsData = lsDataArg;
});

function trackTimeFn() {
  //let timeSpend = moment.duration({ milliseconds: PING_INTERVAL });

  if (lsData && lsData.currentTask) {
    mainWindow.webContents.send('UPDATE_TIME_SPEND', PING_INTERVAL);
  }
}

