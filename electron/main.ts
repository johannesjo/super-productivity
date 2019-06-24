'use strict';
import {App, app, globalShortcut, ipcMain, powerMonitor, powerSaveBlocker} from 'electron';
import * as notifier from 'node-notifier';
import {info} from 'electron-log';
import {CONFIG} from './CONFIG';

import {initIndicator} from './indicator';
import {createWindow} from './main-window';

import {sendJiraRequest, setupRequestHeadersForImages} from './jira';
import {getGitLog} from './git-log';
import {initGoogleAuth} from './google-auth';
import {errorHandler} from './error-handler';
import {initDebug} from './debug';
import {
  IPC_BACKUP,
  IPC_EXEC,
  IPC_GIT_LOG,
  IPC_IDLE_TIME,
  IPC_JIRA_MAKE_REQUEST_EVENT,
  IPC_JIRA_SETUP_IMG_HEADERS,
  IPC_NOTIFY,
  IPC_ON_BEFORE_QUIT,
  IPC_REGISTER_GLOBAL_SHORTCUTS_EVENT,
  IPC_SET_PROGRESS_BAR,
  IPC_SHOW_OR_FOCUS,
  IPC_SHUTDOWN,
  IPC_SHUTDOWN_NOW,
  IPC_TASK_TOGGLE_START
} from './ipc-events.const';
import {backupData} from './backup';
import electronDl from 'electron-dl';
import {JiraCfg} from '../src/app/features/issue/jira/jira';
import {KeyboardConfig} from '../src/app/features/config/config.model';
import BrowserWindow = Electron.BrowserWindow;

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
electronDl({openFolderWhenDone: true});

let mainWin: BrowserWindow;
const nestedWinParams = {isDarwinForceQuit: false};
// keep app active to keep time tracking running
powerSaveBlocker.start('prevent-app-suspension');

app_.on('second-instance', () => {
  if (mainWin) {
    showApp();
    if (mainWin.isMinimized()) {
      mainWin.restore();
    }
    mainWin.focus();
  }
});

// make it a single instance by closing other instances but allow for dev mode
if (!app_.requestSingleInstanceLock() && !IS_DEV) {
  quitAppNow();
}

// Allow invalid certificates for jira requests
app_.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  console.log(error);
  event.preventDefault();
  callback(true);
});

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


app_.on('ready', () => {
  let suspendStart;
  const sendIdleMsgIfOverMin = (idleTime) => {
    // sometimes when starting a second instance we get here although we don't want to
    if (!mainWin) {
      info('special case occurred when trackTimeFn is called even though, this is a second instance of the app');
      return;
    }

    // don't update if the user is about to close
    if (!app_.isQuiting && idleTime > CONFIG.MIN_IDLE_TIME) {
      mainWin.webContents.send(IPC_IDLE_TIME, idleTime);
    }
  };

  const checkIdle = () => powerMonitor['querySystemIdleTime']((idleTimeSeconds) => {
    sendIdleMsgIfOverMin(idleTimeSeconds * 1000);
  });

  // init time tracking interval
  setInterval(checkIdle, CONFIG.IDLE_PING_INTERVAL);

  powerMonitor.on('suspend', () => {
    suspendStart = Date.now();
  });

  powerMonitor.on('lock-screen', () => {
    suspendStart = Date.now();
  });

  powerMonitor.on('resume', () => {
    sendIdleMsgIfOverMin(Date.now() - suspendStart);
  });

  powerMonitor.on('unlock-screen', () => {
    sendIdleMsgIfOverMin(Date.now() - suspendStart);
  });
});


app_.on('before-quit', () => {
  // handle darwin
  if (IS_MAC) {
    nestedWinParams.isDarwinForceQuit = true;
  }
});

app_.on('will-quit', () => {
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
ipcMain.on(IPC_SHUTDOWN_NOW, quitAppNow);

ipcMain.on(IPC_SHUTDOWN, quitApp);

ipcMain.on(IPC_EXEC, exec);

ipcMain.on(IPC_BACKUP, backupData);

ipcMain.on(IPC_SET_PROGRESS_BAR, (ev, {progress, mode}) => {
  if (mainWin) {
    mainWin.setProgressBar(Math.min(Math.max(progress, 0), 1), {mode});
  }
});


ipcMain.on(IPC_REGISTER_GLOBAL_SHORTCUTS_EVENT, (ev, cfg) => {
  registerShowAppShortCuts(cfg);
});

ipcMain.on(IPC_JIRA_SETUP_IMG_HEADERS, (ev, jiraCfg: JiraCfg) => {
  setupRequestHeadersForImages(jiraCfg);
});

ipcMain.on(IPC_JIRA_MAKE_REQUEST_EVENT, (ev, request) => {
  sendJiraRequest(request);
});

ipcMain.on(IPC_GIT_LOG, (ev, cwd) => {
  getGitLog(cwd);
});

ipcMain.on(IPC_NOTIFY, (ev, notification) => {
  notifier.notify({...notification, message: notification.body});
});

ipcMain.on(IPC_SHOW_OR_FOCUS, () => {
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

function registerShowAppShortCuts(cfg: KeyboardConfig) {
  // unregister all previous
  globalShortcut.unregisterAll();
  const GLOBAL_KEY_CFG_KEYS: string[] = ['globalShowHide', 'globalToggleTaskStart'];

  if (cfg) {
    Object.keys(cfg)
      .filter(key => GLOBAL_KEY_CFG_KEYS.includes(key))
      .forEach((key) => {
        let actionFn: () => void;
        const shortcut = cfg[key];

        switch (key) {
          case 'globalShowHide':
            actionFn = () => {
              if (mainWin.isFocused()) {
                mainWin.hide();
              } else {
                showOrFocus(mainWin);
              }
            };
            break;

          case 'globalToggleTaskStart':
            actionFn = () => {
              mainWin.webContents.send(IPC_TASK_TOGGLE_START);
            };
            break;
        }

        if (shortcut && shortcut.length > 0) {
          const ret = globalShortcut.register(shortcut, actionFn) as unknown;
          if (!ret) {
            errorHandler('Global Shortcut registration failed: ' + shortcut, shortcut);
          }
        }
      });
  }
}

function showApp() {
  showOrFocus(mainWin);
}

function quitApp() {
  mainWin.webContents.send(IPC_ON_BEFORE_QUIT);
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

function exec(ev, command) {
  console.log('running command ' + command);
  const exec_ = require('child_process').exec;
  exec_(command, (error) => {
    if (error) {
      errorHandler(error);
    }
  });
}

