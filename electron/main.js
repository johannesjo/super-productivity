'use strict';

const electron = require('electron');
const powerSaveBlocker = electron.powerSaveBlocker;
const notifier = require('node-notifier');
//const autoUpdater = require('electron-updater').autoUpdater;
const log = require('electron-log');

const CONFIG = require('./CONFIG');

const indicatorMod = require('./indicator');
const mainWinMod = require('./main-window');

const getIdleTime = require('./get-idle-time');
const jira = require('./jira');
const gitLog = require('./git-log');
const googleAuth = require('./google-auth');
const errorHandler = require('./error-handler');

const ICONS_FOLDER = __dirname + '/assets/icons/';
const IS_MAC = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
const DESKTOP_ENV = process.env.DESKTOP_SESSION;
const IS_GNOME = (DESKTOP_ENV === 'gnome' || DESKTOP_ENV === 'gnome-xorg');
const IS_DEV = process.env.NODE_ENV === 'DEV';
if (IS_DEV) {
  console.log('Starting in DEV Mode!!!');
}

const app = electron.app;

let mainWin;
let nestedWinParams = { isDarwinForceQuit: false };

// keep app active to keep time tracking running
powerSaveBlocker.start('prevent-app-suspension');

// make it a single instance by closing other instances
let shouldQuitBecauseAppIsAnotherInstance = app.makeSingleInstance(() => {
  // the callback: only called only for first instance
  // we want to show it, when the other starts to try another
  if (mainWin) {
    showApp();

    if (mainWin.isMinimized()) {
      mainWin.restore();
    }

    mainWin.focus();
  }
});

if (shouldQuitBecauseAppIsAnotherInstance) {
  quitAppNow();
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

let idleInterval;
app.on('ready', () => {
  // init time tracking interval
  idleInterval = setInterval(idleChecker, CONFIG.IDLE_PING_INTERVAL);
});

app.on('before-quit', () => {
  // handle darwin
  if (IS_MAC) {
    nestedWinParams.isDarwinForceQuit = true;
  }

  // un-register all shortcuts.
  electron.globalShortcut.unregisterAll();
});

// AUTO-UPDATER
// ------------
//app.on('ready', () => {
//  // init auto-updates
//  log.info('INIT AUTO UPDATES');
//  // log.info(autoUpdater.getFeedURL());
//  autoUpdater.logger = log;
//  autoUpdater.logger.transports.file.level = 'info';
//  autoUpdater.checkForUpdatesAndNotify();
//});
//
//autoUpdater.on('update-downloaded', (ev, info) => {
//  console.log(ev);
//  // Wait 5 seconds, then quit and install
//  // In your application, you don't need to wait 5 seconds.
//  // You could call autoUpdater.quitAndInstall(); immediately
//  setTimeout(function() {
//    autoUpdater.quitAndInstall();
//  }, 5000)
//});

// FRONTEND EVENTS
// ---------------
electron.ipcMain.on('SHUTDOWN_NOW', quitAppNow);

electron.ipcMain.on('SHUTDOWN', quitApp);

electron.ipcMain.on('REGISTER_GLOBAL_SHORTCUT', (ev, shortcutPassed) => {
  registerShowAppShortCut(shortcutPassed);
});

electron.ipcMain.on('TOGGLE_DEV_TOOLS', () => {
  mainWin.webContents.openDevTools();
});

electron.ipcMain.on('JIRA', (ev, request) => {
  jira(request);
});

electron.ipcMain.on('GIT_LOG', (ev, cwd) => {
  gitLog(cwd, mainWin);
});

electron.ipcMain.on('NOTIFY', (ev, notification) => {
  notifier.notify(notification);
});

electron.ipcMain.on('SHOW_OR_FOCUS', () => {
  showOrFocus(mainWin);
});

// HELPER FUNCTIONS
// ----------------
function createIndicator() {
  indicatorMod.init({
    app,
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
  googleAuth(mainWin);
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
      errorHandler('Key registration failed: ' + shortcutPassed, shortcutPassed)
    }
  }
}

function showApp() {
  showOrFocus(mainWin);
}

function quitApp() {
  mainWin.webContents.send('ON_BEFORE_QUIT');
}

function quitAppNow() {
  app.isQuiting = true;
  app.quit();
}

function showOrFocus(passedWin) {
  // default to main win
  const win = passedWin || mainWin;

  // sometimes when starting a second instance we get here although we don't want to
  if (!win) {
    log.info('special case occurred when showOrFocus is called even though, this is a second instance of the app');
    return;
  }

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

function idleChecker() {
  getIdleTime((idleTime) => {
    if (idleTime === 'NO_SUPPORT' && idleInterval) {
      clearInterval(idleInterval);
    }

    // sometimes when starting a second instance we get here although we don't want to
    if (!mainWin) {
      log.info('special case occurred when trackTimeFn is called even though, this is a second instance of the app');
      return;
    }

    // don't update if the user is about to close
    if (!app.isQuiting) {
      mainWin.webContents.send('IDLE_TIME', idleTime);
    }
  });
}

