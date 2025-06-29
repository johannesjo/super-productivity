import { initIpcInterfaces } from './ipc-handler';
import electronLog, { info, log } from 'electron-log/main';
import {
  App,
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  powerMonitor,
  protocol,
} from 'electron';
import { join } from 'path';
import { initDebug } from './debug';
import * as electronDl from 'electron-dl';
import { IPC } from './shared-with-frontend/ipc-events.const';
import { initBackupAdapter } from './backup';
import { initLocalFileSyncAdapter } from './local-file-sync';
import { initFullScreenBlocker } from './full-screen-blocker';
import { CONFIG } from './CONFIG';
import { lazySetInterval } from './shared-with-frontend/lazy-set-interval';
import { initIndicator } from './indicator';
import { quitApp, showOrFocus } from './various-shared';
import { createWindow } from './main-window';
import { IdleTimeHandler } from './idle-time-handler';
import { destroyOverlayWindow } from './overlay-indicator/overlay-indicator';

const ICONS_FOLDER = __dirname + '/assets/icons/';
const IS_MAC = process.platform === 'darwin';
// const DESKTOP_ENV = process.env.DESKTOP_SESSION;
// const IS_GNOME = DESKTOP_ENV === 'gnome' || DESKTOP_ENV === 'gnome-xorg';
const IS_DEV = process.env.NODE_ENV === 'DEV';

let isShowDevTools: boolean = IS_DEV;
let customUrl: string;
let isDisableTray = false;
let forceDarkTray = false;
let wasUserDataDirSet = false;
let forceX11 = false;

if (IS_DEV) {
  log('Starting in DEV Mode!!!');
}

interface MyApp extends App {
  isQuiting?: boolean;
  isLocked?: boolean;
}

const appIN: MyApp = app;

let mainWin: BrowserWindow;
let idleTimeHandler: IdleTimeHandler;

export const startApp = (): void => {
  // LOAD IPC STUFF
  initIpcInterfaces();

  electronLog.initialize();

  app.commandLine.appendSwitch('enable-speech-dispatcher');

  // work around for #4375
  // https://github.com/johannesjo/super-productivity/issues/4375#issuecomment-2883838113
  // https://github.com/electron/electron/issues/46538#issuecomment-2808806722
  app.commandLine.appendSwitch('gtk-version', '3');

  // Wayland compatibility fixes
  // Force X11 backend on Wayland to avoid rendering issues
  if (process.platform === 'linux') {
    // Check if running on Wayland or if X11 is forced
    const isWayland =
      process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === 'wayland';

    if (isWayland || forceX11) {
      log('Applying X11/Wayland compatibility fixes');
      // Force Ozone platform to X11
      app.commandLine.appendSwitch('ozone-platform', 'x11');

      // Disable GPU vsync to fix GetVSyncParametersIfAvailable() errors
      app.commandLine.appendSwitch('disable-gpu-vsync');

      // Additional flags to improve compatibility
      app.commandLine.appendSwitch('disable-features', 'UseOzonePlatform');
      app.commandLine.appendSwitch('enable-features', 'UseSkiaRenderer');

      // Set GDK backend to X11 which is needed for idle handling to work it seems
      process.env.GDK_BACKEND = 'x11';
    }
  }

  // NOTE: needs to be executed before everything else
  process.argv.forEach((val) => {
    if (val && val.includes('--disable-tray')) {
      isDisableTray = true;
      log('Disable tray icon');
    }

    if (val && val.includes('--force-dark-tray')) {
      forceDarkTray = true;
      log('Force dark mode for tray icon');
    }

    if (val && val.includes('--user-data-dir=')) {
      const customUserDir = val.replace('--user-data-dir=', '').trim();
      log('Using custom directory for user data', customUserDir);
      app.setPath('userData', customUserDir);
      wasUserDataDirSet = true;
    }

    if (val && val.includes('--custom-url=')) {
      customUrl = val.replace('--custom-url=', '').trim();
      log('Using custom url', customUrl);
    }

    if (val && val.includes('--dev-tools')) {
      isShowDevTools = true;
    }

    if (val && val.includes('--force-x11')) {
      forceX11 = true;
      log('Forcing X11 mode');
    }
  });

  // TODO remove at one point in the future and only leave the directory setting part
  // Special handling for snaps, since default user folder will cause problems when updating
  if (
    !wasUserDataDirSet &&
    process.platform === 'linux' &&
    process.env.SNAP &&
    process.env.SNAP_USER_COMMON
  ) {
    // COPY LEGACY SNAP DATA TO COMMON DIRECTORY
    // -----------------------------------------
    const appName = app.getName();
    const commonDir = process.env.SNAP_USER_COMMON;
    const newPath = join(commonDir, '.config', appName);

    // SET COMMON DIRECTORY AS USER DATA DIRECTORY
    // -------------------------------------------
    // set userDa dir to common data to avoid the data being accessed by the update process
    app.setPath('userData', newPath);
    app.setAppLogsPath();
  }

  initDebug({ showDevTools: isShowDevTools }, IS_DEV);

  // NOTE: opening the folder crashes the mas build
  if (!IS_MAC) {
    electronDl({
      openFolderWhenDone: true,
      onCompleted: (file) => {
        if (mainWin) {
          mainWin.webContents.send(IPC.ANY_FILE_DOWNLOADED, file);
        }
      },
    });
  }

  // Allow invalid certificates for jira requests
  appIN.on('certificate-error', (event, webContents, url, err, certificate, callback) => {
    log(err);
    event.preventDefault();
    callback(true);
  });

  // APP EVENT LISTENERS
  // -------------------
  appIN.on('ready', createMainWin);
  appIN.on('ready', () => initBackupAdapter());
  appIN.on('ready', () => initLocalFileSyncAdapter());
  appIN.on('ready', () => initFullScreenBlocker(IS_DEV));

  if (!isDisableTray) {
    appIN.on('ready', createIndicator);
  }

  appIN.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWin === null) {
      createMainWin();
    } else {
      showApp();
    }
  });

  appIN.on('ready', () => {
    // Initialize idle time handler
    idleTimeHandler = new IdleTimeHandler();

    let suspendStart: number;
    const sendIdleMsgIfOverMin = (idleTime: number): void => {
      // sometimes when starting a second instance we get here although we don't want to
      if (!mainWin) {
        info(
          'special case occurred when trackTimeFn is called even though, this is a second instance of the app',
        );
        return;
      }

      // don't update if the user is about to close
      if (!appIN.isQuiting && idleTime > CONFIG.MIN_IDLE_TIME) {
        mainWin.webContents.send(IPC.IDLE_TIME, idleTime);
      }
    };

    const checkIdle = async (): Promise<void> => {
      try {
        const idleTime = await idleTimeHandler.getIdleTimeWithFallbacks();
        sendIdleMsgIfOverMin(idleTime);
      } catch (error) {
        log('Error getting idle time:', error);
        // Fallback to standard method if our handler fails
        sendIdleMsgIfOverMin(powerMonitor.getSystemIdleTime() * 1000);
      }
    };

    // init time tracking interval
    lazySetInterval(checkIdle, CONFIG.IDLE_PING_INTERVAL);

    powerMonitor.on('suspend', () => {
      appIN.isLocked = true;
      suspendStart = Date.now();
      mainWin.webContents.send(IPC.SUSPEND);
    });

    powerMonitor.on('lock-screen', () => {
      appIN.isLocked = true;
      suspendStart = Date.now();
      mainWin.webContents.send(IPC.SUSPEND);
    });

    powerMonitor.on('resume', () => {
      appIN.isLocked = false;
      sendIdleMsgIfOverMin(Date.now() - suspendStart);
      mainWin.webContents.send(IPC.RESUME);
    });

    powerMonitor.on('unlock-screen', () => {
      appIN.isLocked = false;
      sendIdleMsgIfOverMin(Date.now() - suspendStart);
      mainWin.webContents.send(IPC.RESUME);
    });

    protocol.registerFileProtocol('file', (request, callback) => {
      const pathname = decodeURI(request.url.replace('file:///', ''));
      callback(pathname);
    });
  });

  appIN.on('will-quit', () => {
    // un-register all shortcuts.
    globalShortcut.unregisterAll();
  });

  appIN.on('before-quit', () => {
    log('App before-quit: cleaning up resources');

    // Clean up overlay window before quitting
    destroyOverlayWindow();

    // Remove all IPC listeners to prevent memory leaks
    ipcMain.removeAllListeners();

    // Clear any pending timeouts/intervals
    if (global.gc) {
      global.gc();
    }
  });

  appIN.on('window-all-closed', () => {
    log('Quit after all windows being closed');
    // Force quit the app
    app.quit();

    // If app doesn't quit within 2 seconds, force exit
    setTimeout(() => {
      log('Force exiting app as it did not quit properly');
      app.exit(0);
    }, 2000);
  });
  process.on('uncaughtException', (err) => {
    console.log(err);
    process.exit(333);
  });

  // AUTO-UPDATER
  // ------------
  // appIN.on('ready', () => {
  //  // init auto-updates
  //  log.info('INIT AUTO UPDATES');
  //  // log.info(autoUpdater.getFeedURL());
  //  autoUpdater.logger = log;
  //  autoUpdater.logger.transports.file.level = 'info';
  //  autoUpdater.checkForUpdatesAndNotify();
  // });
  //
  // autoUpdater.on('update-downloaded', (ev, info) => {
  //  log(ev);
  //  // Wait 5 seconds, then quit and install
  //  // In your application, you don't need to wait 5 seconds.
  //  // You could call autoUpdater.quitAndInstall(); immediately
  //  setTimeout(function() {
  //    autoUpdater.quitAndInstall();
  //  }, 5000)
  // });

  // HELPER FUNCTIONS
  // ----------------
  // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
  function createIndicator(): void {
    initIndicator({
      app,
      showApp,
      quitApp,
      ICONS_FOLDER,
      forceDarkTray,
    });
  }

  // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
  function createMainWin(): void {
    mainWin = createWindow({
      app,
      IS_DEV,
      ICONS_FOLDER,
      quitApp,
      customUrl,
    });
  }

  // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
  function showApp(): void {
    showOrFocus(mainWin);
  }

  // required for graceful closing
  // @see: https://github.com/electron/electron/issues/5708
  process.on('exit', () => {
    setTimeout(() => {
      log('Quit after process exit');
      app.quit();
    }, 100);
  });
};
