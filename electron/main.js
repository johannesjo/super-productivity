'use strict';

const electron = require('electron');
const powerSaveBlocker = electron.powerSaveBlocker;
const notifier = require('node-notifier');
const moment = require('moment');
const CONFIG = require('./CONFIG');
const ICONS_FOLDER = __dirname + '/assets/icons/';
const IS_MAC = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
const DESKTOP_ENV = process.env.DESKTOP_SESSION;
const IS_GNOME = (DESKTOP_ENV === 'gnome' || DESKTOP_ENV === 'gnome-xorg');
const IS_DEV = process.env.NODE_ENV === 'DEV';

const indicatorMod = require('./indicator');
const mainWinMod = require('./main-window');

const idle = require('./idle');
const jira = require('./jira');
const gitLog = require('./git-log');

const app = electron.app;

let mainWin;
let lastIdleTime;
let currentIdleStart;
let nestedWinParams = { isDarwinForceQuit: false };

// keep app active to keep time tracking running
powerSaveBlocker.start('prevent-app-suspension');

// make it a single instance by closing other instances
let shouldQuitBecauseAppIsAnotherInstance = app.makeSingleInstance(() => {
  if (mainWin) {
    showApp();

    if (mainWin.isMinimized()) {
      mainWin.restore();
    }

    mainWin.focus();
  }
});

if (shouldQuitBecauseAppIsAnotherInstance) {
  quitApp();
  return;
}

// APP EVENT LISTENERS
// -------------------
app.on('ready', createMainWin);
app.on('ready', createIndicator);

app.on('activate', function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWin === null) {
    createMainWin();
  } else {
    showApp();
  }
});

app.on('ready', () => {
  setInterval(trackTimeFn, CONFIG.PING_INTERVAL);
});

app.on('before-quit', () => {
  // handle darwin
  if (IS_MAC) {
    nestedWinParams.isDarwinForceQuit = true;
  }

  // un-register all shortcuts.
  electron.globalShortcut.unregisterAll();
});

// FRONTEND EVENTS
// ---------------
electron.ipcMain.on('SHUTDOWN', quitApp);

electron.ipcMain.on('REGISTER_GLOBAL_SHORTCUT', (ev, shortcutPassed) => {
  registerShowAppShortCut(shortcutPassed);
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

// HELPER FUNCTIONS
// ----------------
function createIndicator() {
  indicatorMod.init({
    app,
    mainWin,
    showApp,
    quitApp,
    IS_MAC,
    IS_LINUX,
    IS_GNOME,
    ICONS_FOLDER,
  });
}

function createMainWin() {
  mainWin = mainWinMod.createWindow({
    app,
    IS_DEV,
    ICONS_FOLDER,
    IS_MAC,
    quitApp,
    nestedWinParams,
    indicatorMod,
  });
}

function registerShowAppShortCut(shortcutPassed) {
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
}

function showIdleDialog(idleTimeInMs) {
  // first show, then send again
  mainWin.webContents.send('WAS_IDLE', ({
    idleTimeInMs: idleTimeInMs,
    minIdleTimeInMs: CONFIG.MIN_IDLE_TIME
  }));
}

function showApp() {
  showOrFocus(mainWin);
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

  // focus window afterwards always
  setTimeout(() => {
    win.focus();
  }, 60);
}

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

