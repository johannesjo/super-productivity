'use strict';
import { App, app, globalShortcut, ipcMain, powerSaveBlocker } from 'electron';

import * as notifier from 'node-notifier';
import { info } from 'electron-log';
import { CONFIG } from './CONFIG';

import { initIndicator } from './indicator';
import { createWindow } from './main-window';

import { getIdleTime } from './get-idle-time';
import { sendJiraRequest } from './jira';
import { getGitLog } from './git-log';
import { initGoogleAuth } from './google-auth';
import { errorHandler } from './error-handler';
import { initDebug } from './debug';

const ICONS_FOLDER = __dirname + '/assets/icons/';
const IS_MAC = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
const DESKTOP_ENV = process.env.DESKTOP_SESSION;
const IS_GNOME = (DESKTOP_ENV === 'gnome' || DESKTOP_ENV === 'gnome-xorg');
const IS_DEV = process.env.NODE_ENV === 'DEV';
if (IS_DEV) {
  console.log('Starting in DEV Mode!!!');
}

interface MyApp extends App {
  isQuiting?: boolean;
}

const app_: MyApp = app;

initDebug({showDevTools: IS_DEV}, IS_DEV);

let mainWin;
const nestedWinParams = {isDarwinForceQuit: false};

// keep app active to keep time tracking running
powerSaveBlocker.start('prevent-app-suspension');

// make it a single instance by closing other instances
app_.requestSingleInstanceLock();
app_.on('second-instance', () => {
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

// if (shouldQuitBecauseAppIsAnotherInstance) {
//  quitAppNow();
//  return;
// }

// APP EVENT LISTENERS
// -------------------
app_.on('ready', createMainWin);
app_.on('ready', createIndicator);

app_.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWin === null) {
    createMainWin();
  } else {
    showApp();
  }
});

let idleInterval;
app_.on('ready', () => {
  // init time tracking interval
  idleInterval = setInterval(idleChecker, CONFIG.IDLE_PING_INTERVAL);
});

app_.on('before-quit', () => {
  // handle darwin
  if (IS_MAC) {
    nestedWinParams.isDarwinForceQuit = true;
  }

  // un-register all shortcuts.
  globalShortcut.unregisterAll();
});

// AUTO-UPDATER
// ------------
// app_.on('ready', () => {
//  // init auto-updates
//  log.info('INIT AUTO UPDATES');
//  // log.info(autoUpdater.getFeedURL());
//  autoUpdater.logger = log;
//  autoUpdater.logger.transports.file.level = 'info';
//  autoUpdater.checkForUpdatesAndNotify();
// });
//
// autoUpdater.on('update-downloaded', (ev, info) => {
//  console.log(ev);
//  // Wait 5 seconds, then quit and install
//  // In your application, you don't need to wait 5 seconds.
//  // You could call autoUpdater.quitAndInstall(); immediately
//  setTimeout(function() {
//    autoUpdater.quitAndInstall();
//  }, 5000)
// });

// FRONTEND EVENTS
// ---------------
ipcMain.on('SHUTDOWN_NOW', quitAppNow);

ipcMain.on('SHUTDOWN', quitApp);

ipcMain.on('EXEC', exec);

ipcMain.on('REGISTER_GLOBAL_SHORTCUT', (ev, shortcutPassed) => {
  registerShowAppShortCut(shortcutPassed);
});

ipcMain.on('TOGGLE_DEV_TOOLS', () => {
  mainWin.webContents.openDevTools();
});

ipcMain.on('JIRA', (ev, request) => {
  sendJiraRequest(request);
});

ipcMain.on('GIT_LOG', (ev, cwd) => {
  getGitLog(cwd);
});

ipcMain.on('NOTIFY', (ev, notification) => {
  notifier.notify({...notification, message: notification.body});
});

ipcMain.on('SHOW_OR_FOCUS', () => {
  showOrFocus(mainWin);
});

// HELPER FUNCTIONS
// ----------------
function createIndicator() {
  initIndicator({
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
  mainWin = createWindow({
    app,
    IS_DEV,
    ICONS_FOLDER,
    IS_MAC,
    quitApp,
    nestedWinParams,
    // TODO fix
    // indicatorMod,
  });
  initGoogleAuth();
}

function registerShowAppShortCut(shortcutPassed) {
  if (shortcutPassed) {
    // unregister all previous
    globalShortcut.unregisterAll();

    // Register a shortcut listener.
    const ret = globalShortcut.register(shortcutPassed, () => {
      if (mainWin.isFocused()) {
        mainWin.hide();
      } else {
        showOrFocus(mainWin);
      }
    });
    console.log(ret);

    // TODO make this work again
    // tslint:disable-next-line
    // if (!ret) {
    //   errorHandler('Key registration failed: ' + shortcutPassed, shortcutPassed);
    // }
  }
}

function showApp() {
  showOrFocus(mainWin);
}

function quitApp() {
  mainWin.webContents.send('ON_BEFORE_QUIT');
}

function quitAppNow() {
  // tslint:disable-next-line
  app_.isQuiting = true;
  app_.quit();
}

function showOrFocus(passedWin) {
  // default to main win
  const win = passedWin || mainWin;

  // sometimes when starting a second instance we get here although we don't want to
  if (!win) {
    info('special case occurred when showOrFocus is called even though, this is a second instance of the app');
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
      info('special case occurred when trackTimeFn is called even though, this is a second instance of the app');
      return;
    }

    // don't update if the user is about to close
    // tslint:disable-next-line
    if (!app_.isQuiting) {
      mainWin.webContents.send('IDLE_TIME', idleTime);
    }
  });
}

function exec(ev, command) {
  console.log('running command ' + command);
  const exec_ = require('child_process').exec;
  exec_(command, (error) => {
    if (error) {
      errorHandler(error);
    }
  });
}
