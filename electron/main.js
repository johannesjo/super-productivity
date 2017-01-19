'use strict';

const electron = require('electron');
const powerSaveBlocker = require('electron').powerSaveBlocker;
const moment = require('moment');
const notifier = require('node-notifier');
const open = require('open');
const CONFIG = require('./CONFIG');
const ICONS_FOLDER = __dirname + '/assets/icons/';

const idle = require('./idle');
const jira = require('./jira');
const gitLog = require('./git-log');
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

let tray = null;
app.on('ready', () => {
  let trayIcoFile;
  if (process.platform === 'darwin') {
    trayIcoFile = 'tray-ico-dark.png'
  } else {
    trayIcoFile = 'tray-ico.png'
  }

  tray = new electron.Tray(ICONS_FOLDER + trayIcoFile);
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
  // mac os only
  tray.setHighlightMode('always');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
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
  if (tray) {
    tray.destroy();
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

electron.ipcMain.on('GIT_LOG', (ev, cwd) => {
  gitLog(cwd, mainWindow);
});

electron.ipcMain.on('NOTIFY', (ev, notification) => {
  notifier.notify(notification);
});

let saveLastTitle;
electron.ipcMain.on('CHANGED_CURRENT_TASK', (ev, task) => {
  if (task && task.title) {
    let title = task.title;
    let timeStr = '';

    if (title.length > 50) {
      title = title.substring(0, 47) + "...";
    }

    if (task.timeSpent && task.timeSpent._data) {
      task.timeSpent = moment.duration(task.timeSpent._data);
      timeStr += parseInt(task.timeSpent.asMinutes()).toString() + 'm';
    }
    if (task.timeEstimate) {
      timeStr += '/' + moment.duration(task.timeEstimate).asMinutes() + 'm ';
    }
    if (tray) {
      tray.setTitle(title + ' ' + timeStr);
    }

    saveLastTitle = task.title;
  }
  // Call this again for Linux because we modified the context menu
  //tray.setContextMenu(contextMenu)
});

function showIdleDialog(realIdleTime) {
  // first show, then send again
  mainWindow.webContents.send('WAS_IDLE', (realIdleTime));
}

let currentIdleStart;

function trackTimeFn() {
  idle((stdout) => {
    let idleTime = parseInt(stdout, 10);
    // go to 'idle mode' when th
    if (idleTime > CONFIG.MIN_IDLE_TIME || lastIdleTime > CONFIG.MIN_IDLE_TIME) {
      if (!currentIdleStart) {
        currentIdleStart = moment();
      }

      // show idle dialog once not idle any more
      if (lastIdleTime > idleTime) {
        let now = moment();
        let realIdleTime = moment.duration(now.diff(currentIdleStart)).asMilliseconds();

        // TODO this seem to open a new instance find out why
        showIdleDialog(realIdleTime);
        // we try using a timeout to prevent multiple windows from opening
        setTimeout(() => {
          mainWindow.show();
        }, 20);

        // unset currentIdleStart
        currentIdleStart = undefined;
      }
    }
    // track regularly
    else {
      mainWindow.webContents.send('UPDATE_TIME_SPEND', {
        timeSpentInMs: CONFIG.PING_INTERVAL,
        idleTimeInMs: idleTime
      });
    }

    // save last idle time
    lastIdleTime = idleTime;
  });

}

