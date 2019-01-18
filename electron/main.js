'use strict';
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var electron = require('electron');
var powerSaveBlocker = electron.powerSaveBlocker;
var notifier = require('node-notifier');
//const autoUpdater = require('electron-updater').autoUpdater;
var log = require('electron-log');
var electronLocalshortcut = require('electron-localshortcut');
var CONFIG = require('./CONFIG');
var indicatorMod = require('./indicator');
var mainWinMod = require('./main-window');
var getIdleTime = require('./get-idle-time');
var jira = require('./jira');
var gitLog = require('./git-log');
var googleAuth = require('./google-auth');
var errorHandler = require('./error-handler');
var ICONS_FOLDER = __dirname + '/assets/icons/';
var IS_MAC = process.platform === 'darwin';
var IS_LINUX = process.platform === 'linux';
var DESKTOP_ENV = process.env.DESKTOP_SESSION;
var IS_GNOME = (DESKTOP_ENV === 'gnome' || DESKTOP_ENV === 'gnome-xorg');
var IS_DEV = process.env.NODE_ENV === 'DEV';
if (IS_DEV) {
    console.log('Starting in DEV Mode!!!');
}
var app = electron.app;
require('./debug')({ showDevTools: IS_DEV }, IS_DEV);
var mainWin;
var nestedWinParams = { isDarwinForceQuit: false };
// keep app active to keep time tracking running
powerSaveBlocker.start('prevent-app-suspension');
// make it a single instance by closing other instances
app.requestSingleInstanceLock();
app.on('second-instance', function () {
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
//if (shouldQuitBecauseAppIsAnotherInstance) {
//  quitAppNow();
//  return;
//}
// APP EVENT LISTENERS
// -------------------
app.on('ready', createMainWin);
app.on('ready', createIndicator);
app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWin === null) {
        createMainWin();
    }
    else {
        showApp();
    }
});
var idleInterval;
app.on('ready', function () {
    // init time tracking interval
    idleInterval = setInterval(idleChecker, CONFIG.IDLE_PING_INTERVAL);
});
app.on('before-quit', function () {
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
electron.ipcMain.on('EXEC', exec);
electron.ipcMain.on('REGISTER_GLOBAL_SHORTCUT', function (ev, shortcutPassed) {
    registerShowAppShortCut(shortcutPassed);
});
electron.ipcMain.on('TOGGLE_DEV_TOOLS', function () {
    mainWin.webContents.openDevTools();
});
electron.ipcMain.on('JIRA', function (ev, request) {
    jira(request);
});
electron.ipcMain.on('GIT_LOG', function (ev, cwd) {
    gitLog(cwd, mainWin);
});
electron.ipcMain.on('NOTIFY', function (ev, notification) {
    notifier.notify(__assign({}, notification, { message: notification.body }));
});
electron.ipcMain.on('SHOW_OR_FOCUS', function () {
    showOrFocus(mainWin);
});
// HELPER FUNCTIONS
// ----------------
function createIndicator() {
    indicatorMod.init({
        app: app,
        showApp: showApp,
        quitApp: quitApp,
        IS_MAC: IS_MAC,
        IS_LINUX: IS_LINUX,
        IS_GNOME: IS_GNOME,
        ICONS_FOLDER: ICONS_FOLDER,
    });
}
function createMainWin() {
    mainWin = mainWinMod.createWindow({
        app: app,
        IS_DEV: IS_DEV,
        ICONS_FOLDER: ICONS_FOLDER,
        IS_MAC: IS_MAC,
        quitApp: quitApp,
        nestedWinParams: nestedWinParams,
        indicatorMod: indicatorMod,
    });
    googleAuth.init();
}
function registerShowAppShortCut(shortcutPassed) {
    if (shortcutPassed) {
        // unregister all previous
        electron.globalShortcut.unregisterAll();
        // Register a shortcut listener.
        var ret = electron.globalShortcut.register(shortcutPassed, function () {
            if (mainWin.isFocused()) {
                mainWin.hide();
            }
            else {
                showOrFocus(mainWin);
            }
        });
        if (!ret) {
            errorHandler('Key registration failed: ' + shortcutPassed, shortcutPassed);
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
    var win = passedWin || mainWin;
    // sometimes when starting a second instance we get here although we don't want to
    if (!win) {
        log.info('special case occurred when showOrFocus is called even though, this is a second instance of the app');
        return;
    }
    if (win.isVisible()) {
        win.focus();
    }
    else {
        win.show();
    }
    // focus window afterwards always
    setTimeout(function () {
        win.focus();
    }, 60);
}
function idleChecker() {
    getIdleTime(function (idleTime) {
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
function exec(ev, command) {
    console.log('running command ' + command);
    var exec = require('child_process').exec;
    exec(command, function (error) {
        if (error) {
            errorHandler(error);
        }
    });
}
//# sourceMappingURL=main.js.map