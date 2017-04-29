'use strict';

const electron = require('electron');
const powerSaveBlocker = require('electron').powerSaveBlocker;
const moment = require('moment');
const notifier = require('node-notifier');
const open = require('open');
const fs = require('fs');
const CONFIG = require('./CONFIG');
const ICONS_FOLDER = __dirname + '/assets/icons/';
const IS_MAC = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
const IS_DEV = process.env.NODE_ENV === 'DEV';

const DESKTOP_ENV = process.env.DESKTOP_SESSION;
const IS_GNOME = (DESKTOP_ENV === 'gnome');

const dbus = require('./dbus');
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

// check if shell extension is installed
let isGnomeShellExtInstalled = false;
if (IS_LINUX && IS_GNOME) {
  const HOME_DIR = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
  if (fs.existsSync(HOME_DIR + '/.local/share/gnome-shell/extensions/indicator@johannes.super-productivity.com')) {
    isGnomeShellExtInstalled = true;
  }
}

function createWindow() {
  let frontendDir;

  if (IS_DEV) {
    frontendDir = 'app-src';
  } else {
    frontendDir = 'app';
  }

  // Create the browser window.
  mainWin = new BrowserWindow({ width: 800, height: 600 });

  if (isGnomeShellExtInstalled) {
    dbus.setMainWindow(mainWin);
  }

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

  if (IS_MAC) {
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

  // open new window links in browser
  mainWin.webContents.on('new-window', function (event, url) {
    event.preventDefault();
    open(url);
  });

  mainWin.on('close', function (event) {
    // handle darwin
    if (IS_MAC) {
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

function showApp() {
  mainWin.show();
}
function quitApp() {
  app.isQuiting = true;
  app.quit();
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
  quitApp();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

let tray = null;
app.on('ready', () => {
  let trayIcoFile;

  if (isGnomeShellExtInstalled) {

    return;
  }

  if (IS_MAC) {
    trayIcoFile = 'tray-ico-dark.png'
  } else {
    trayIcoFile = 'tray-ico.png'
  }

  tray = new electron.Tray(ICONS_FOLDER + trayIcoFile);
  let contextMenu = electron.Menu.buildFromTemplate([
    {
      label: 'Show App', click: showApp
    },
    {
      label: 'Quit', click: quitApp
    }
  ]);
  // mac os only
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    showApp();
  });
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWin === null) {
    createWindow();
  } else {
    showApp();
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
  if (IS_MAC) {
    darwinForceQuit = true;
  }

  // Unregister all shortcuts.
  electron.globalShortcut.unregisterAll();
});

// listen to events from frontend
electron.ipcMain.on('SHUTDOWN', quitApp);

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
      title = title.substring(0, 47) + '...';
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
    if (isGnomeShellExtInstalled) {
      dbus.setTask(title + ' ' + timeStr);
    }

    saveLastTitle = task.title;
  } else {
    if (isGnomeShellExtInstalled) {
      dbus.setTask('NONE');
    }
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

