'use strict';

const electron = require('electron');
const powerSaveBlocker = require('electron').powerSaveBlocker;
const moment = require('moment');
const open = require('open');
const CONFIG = require('./CONFIG');
const ICONS_FOLDER = __dirname + '/assets/icons/';

const idle = require('./idle');
const jira = require('./jira');
const pyGtkIndicator = require('./py-gtk-indicator');

powerSaveBlocker.start('prevent-app-suspension');

// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let lastIdleTime;

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
  //mainWindow.webContents.openDevTools();

  // open new window links in browser
  mainWindow.webContents.on('new-window', function (event, url) {
    event.preventDefault();
    open(url);
  });

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
  //if (process.platform !== 'darwin') {
  app.quit();
  //}
});

let appIcon = null;
app.on('ready', () => {
  appIcon = new electron.Tray(ICONS_FOLDER + 'tray-ico.png');
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

  appIcon.on('click', () => {
    console.log('I am here!');

    mainWindow.show();
  });
});

app.on('ready', () => {
  // Register a 'CommandOrControl+X' shortcut listener.
  const ret = electron.globalShortcut.register('CommandOrControl+Shift+X', () => {
    mainWindow.show();
  });

  if (!ret) {
    console.log('key registration failed');
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('ready', () => {
  setInterval(trackTimeFn, CONFIG.PING_INTERVAL);
});

app.on('before-quit', () => {
  if (appIcon) {
    appIcon.destroy();
  }
});

// listen to events from frontend
electron.ipcMain.on('SHUTDOWN', () => {
  app.isQuiting = true;
  app.quit();
});

electron.ipcMain.on('TOGGLE_DEV_TOOLS', () => {
  mainWindow.webContents.openDevTools();
});

electron.ipcMain.on('JIRA', (ev, request) => {
  jira(mainWindow, request);
});

let saveLastTitle;
electron.ipcMain.on('CHANGED_CURRENT_TASK', (ev, task) => {
  if (task && task.title) {
    let title = task.title;
    if (title.length > 50) {
      title = title.substring(0, 47) + "...";
    }

    if (appIcon) {
      appIcon.setTitle(title);
    }

    saveLastTitle = task.title;
  }
  // Call this again for Linux because we modified the context menu
  //appIcon.setContextMenu(contextMenu)
});

function trackTimeFn() {
  //let timeSpend = moment.duration({ milliseconds: CONFIG.PING_INTERVAL });

  idle((stdout) => {
    let idleTime = parseInt(stdout, 10);
    if (idleTime > 0 && lastIdleTime > CONFIG.MIN_IDLE_TIME && lastIdleTime > idleTime) {
      mainWindow.show();
      mainWindow.webContents.send('WAS_IDLE', (lastIdleTime - CONFIG.MIN_IDLE_TIME + CONFIG.PING_INTERVAL));
    } else {
      mainWindow.webContents.send('UPDATE_TIME_SPEND', CONFIG.PING_INTERVAL);
    }

    lastIdleTime = idleTime;
  });

}

