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
let mainWin;
let lastIdleTime;
let darwinForceQuit = false;

function createWindow() {
  // Create the browser window.
  mainWin = new BrowserWindow({ width: 800, height: 600 });

  // and load the index.html of the app.
  mainWin.loadURL(url.format({
    pathname: path.join(__dirname, '../app/index.html'),
    protocol: 'file:',
    slashes: true,
    webPreferences: {
      scrollBounce: true
    },
    icon: ICONS_FOLDER + '/app-icons/icon_256x256.png'
  }));

  // Open the DevTools.
  //mainWin.webContents.openDevTools();

  // open new window links in browser
  mainWin.webContents.on('new-window', function (event, url) {
    event.preventDefault();
    open(url);
  });

  mainWin.on('close', function (event) {
    // handle darwin
    if (process.platform === 'darwin') {
      if (!darwinForceQuit) {
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

function showOrFocus(win) {
  if (win.isVisible()) {
    win.focus();
  } else {
    win.show();
  }
}

// Make it a single instance
let shouldQuitBecauseAppIsAnotherInstance = app.makeSingleInstance(() => {
  if (mainWin) {
    if (mainWin.isMinimized()) {
      mainWin.restore();
    }
    mainWin.focus();
  }
});
if (shouldQuitBecauseAppIsAnotherInstance) {
  app.quit();
  return;
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

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
      mainWin.show();
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
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWin.show();
  });
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWin === null) {
    createWindow();
  } else {
    mainWin.show();
  }

});

app.on('ready', () => {
  setInterval(trackTimeFn, CONFIG.PING_INTERVAL);
});

app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
  }

  // handle darwin
  if (process.platform === 'darwin') {
    darwinForceQuit = true;
  }

  // Unregister all shortcuts.
  electron.globalShortcut.unregisterAll();
});

// listen to events from frontend
electron.ipcMain.on('SHUTDOWN', () => {
  app.isQuiting = true;
  app.quit();
});

electron.ipcMain.on('REGISTER_GLOBAL_SHORTCUT', (ev, shortcutPassed) => {
  if (shortcutPassed) {
    // unregister all previous
    electron.globalShortcut.unregisterAll();

    // Register a shortcut listener.
    const ret = electron.globalShortcut.register(shortcutPassed, () => {
      if (mainWin.isFocused()) {
        mainWin.hide();
      } else {
        showOrFocus(mainWin);
      }
    });

    if (!ret) {
      console.log('key registration failed');
    }
  }
});

electron.ipcMain.on('TOGGLE_DEV_TOOLS', () => {
  mainWin.webContents.openDevTools();
});

electron.ipcMain.on('JIRA', (ev, request) => {
  jira(mainWin, request);
});

electron.ipcMain.on('GIT_LOG', (ev, cwd) => {
  gitLog(cwd, mainWin);
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

function showIdleDialog(idleTimeInMs) {
  // first show, then send again
  mainWin.webContents.send('WAS_IDLE', ({
    idleTimeInMs: idleTimeInMs,
    minIdleTimeInMs: CONFIG.MIN_IDLE_TIME
  }));
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

        showOrFocus(mainWin);
        showIdleDialog(realIdleTime);

        // unset currentIdleStart
        currentIdleStart = undefined;
      }
    }
    // track regularly
    else {
      mainWin.webContents.send('UPDATE_TIME_SPEND', {
        timeSpentInMs: CONFIG.PING_INTERVAL,
        idleTimeInMs: idleTime
      });
    }

    // save last idle time
    lastIdleTime = idleTime;
  });

}

