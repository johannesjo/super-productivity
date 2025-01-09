import * as windowStateKeeper from 'electron-window-state';
import {
  App,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  shell,
} from 'electron';
import { errorHandlerWithFrontendInform } from './error-handler-with-frontend-inform';
import * as path from 'path';
import { join, normalize } from 'path';
import { format } from 'url';
import { IPC } from './shared-with-frontend/ipc-events.const';
import { getSettings } from './get-settings';
import { readFileSync, stat } from 'fs';
import { error, log } from 'electron-log/main';
import { GlobalConfigState } from '../src/app/features/config/global-config.model';
import { IS_MAC } from './common.const';

let mainWin: BrowserWindow;

const mainWinModule: {
  win?: BrowserWindow;
  isAppReady: boolean;
} = {
  win: undefined,
  isAppReady: false,
};

export const getWin = (): BrowserWindow => {
  if (!mainWinModule.win) {
    throw new Error('No main window');
  }
  return mainWinModule.win;
};

export const getIsAppReady = (): boolean => {
  return mainWinModule.isAppReady;
};

export const createWindow = ({
  IS_DEV,
  ICONS_FOLDER,
  quitApp,
  app,
  customUrl,
}: {
  IS_DEV: boolean;
  ICONS_FOLDER: string;
  quitApp: () => void;
  app: App;
  customUrl?: string;
}): BrowserWindow => {
  // make sure the main window isn't already created
  if (mainWin) {
    errorHandlerWithFrontendInform('Main window already exists');
    return mainWin;
  }

  // workaround for https://github.com/electron/electron/issues/16521
  if (!IS_MAC) {
    Menu.setApplicationMenu(null);
  }

  const mainWindowState = windowStateKeeper({
    defaultWidth: 800,
    defaultHeight: 800,
  });

  mainWin = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minHeight: 240,
    minWidth: 300,
    titleBarStyle: IS_MAC ? 'hidden' : 'default',
    show: false,
    webPreferences: {
      scrollBounce: true,
      backgroundThrottling: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      // make remote module work with those two settings
      contextIsolation: true,
    },
    icon: ICONS_FOLDER + '/icon_256x256.png',
  });

  // see: https://pratikpc.medium.com/bypassing-cors-with-electron-ab7eaf331605
  mainWin.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    const { requestHeaders } = details;
    removeKeyInAnyCase(requestHeaders, 'Origin');
    removeKeyInAnyCase(requestHeaders, 'Referer');
    removeKeyInAnyCase(requestHeaders, 'Cookie');
    removeKeyInAnyCase(requestHeaders, 'sec-ch-ua');
    removeKeyInAnyCase(requestHeaders, 'sec-ch-ua-mobile');
    removeKeyInAnyCase(requestHeaders, 'sec-ch-ua-platform');
    removeKeyInAnyCase(requestHeaders, 'sec-fetch-dest');
    removeKeyInAnyCase(requestHeaders, 'sec-fetch-mode');
    removeKeyInAnyCase(requestHeaders, 'sec-fetch-site');
    removeKeyInAnyCase(requestHeaders, 'accept-encoding');
    removeKeyInAnyCase(requestHeaders, 'accept-language');
    removeKeyInAnyCase(requestHeaders, 'priority');
    removeKeyInAnyCase(requestHeaders, 'accept');

    // NOTE this is needed for GitHub api requests to work :(
    if (!details.url.includes('github.com')) {
      removeKeyInAnyCase(requestHeaders, 'User-Agent');
    }
    callback({ requestHeaders });
  });

  mainWin.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const { responseHeaders } = details;
    upsertKeyValue(responseHeaders, 'Access-Control-Allow-Origin', ['*']);
    upsertKeyValue(responseHeaders, 'Access-Control-Allow-Headers', ['*']);
    upsertKeyValue(responseHeaders, 'Access-Control-Allow-Methods', ['*']);

    callback({
      responseHeaders,
    });
  });

  mainWindowState.manage(mainWin);

  const url = customUrl
    ? customUrl
    : IS_DEV
      ? 'http://localhost:4200'
      : format({
          pathname: normalize(join(__dirname, '../dist/browser/index.html')),
          protocol: 'file:',
          slashes: true,
        });

  mainWin.loadURL(url).then(() => {
    // load custom stylesheet if any
    const CSS_FILE_PATH = app.getPath('userData') + '/styles.css';
    stat(app.getPath('userData') + '/styles.css', (err) => {
      if (err) {
        log('No custom styles detected at ' + CSS_FILE_PATH);
      } else {
        log('Loading custom styles from ' + CSS_FILE_PATH);
        const styles = readFileSync(CSS_FILE_PATH, { encoding: 'utf8' });
        mainWin.webContents.insertCSS(styles).then(log).catch(error);
      }
    });
  });

  // show gracefully
  mainWin.once('ready-to-show', () => {
    mainWin.show();
  });

  initWinEventListeners(app);

  if (IS_MAC) {
    createMenu(quitApp);
  } else {
    mainWin.setMenu(null);
    mainWin.setMenuBarVisibility(false);
  }

  // update prop
  mainWinModule.win = mainWin;

  // listen for app ready
  ipcMain.on(IPC.APP_READY, () => {
    mainWinModule.isAppReady = true;
  });

  return mainWin;
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function initWinEventListeners(app: any): void {
  const openUrlInBrowser = (url: string): void => {
    // needed for mac; especially for jira urls we might have a host like this www.host.de//
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname.replace('//', '/');
    const wellFormedUrl = urlObj.toString();
    const wasOpened = shell.openExternal(wellFormedUrl);
    if (!wasOpened) {
      shell.openExternal(wellFormedUrl);
    }
  };

  // open new window links in browser
  mainWin.webContents.on('will-navigate', (ev, url) => {
    if (!url.includes('localhost')) {
      ev.preventDefault();
      openUrlInBrowser(url);
    }
  });
  mainWin.webContents.setWindowOpenHandler((details) => {
    openUrlInBrowser(details.url);
    return { action: 'deny' };
  });

  // TODO refactor quitting mess
  appCloseHandler(app);
  appMinimizeHandler(app);
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function createMenu(
  quitApp: (
    menuItem: MenuItem,
    browserWindow: BrowserWindow | undefined,
    event: KeyboardEvent,
  ) => void,
): void {
  // Create application menu to enable copy & pasting on MacOS
  const menuTpl = [
    {
      label: 'Application',
      submenu: [
        { label: 'About Super Productivity', selector: 'orderFrontStandardAboutPanel:' },
        { type: 'separator' },
        {
          label: 'Quit',
          click: quitApp,
          accelerator: 'CmdOrCtrl+Q',
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' },
      ],
    },
  ];
  const menuTplOUT = menuTpl as MenuItemConstructorOptions[];

  // we need to set a menu to get copy & paste working for mac os x
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTplOUT));
}

// TODO this is ugly as f+ck
const appCloseHandler = (app: App): void => {
  let ids: string[] = [];

  const _quitApp = (): void => {
    (app as any).isQuiting = true;
    mainWin.close();
  };

  ipcMain.on(IPC.REGISTER_BEFORE_CLOSE, (ev, { id }) => {
    ids.push(id);
  });
  ipcMain.on(IPC.UNREGISTER_BEFORE_CLOSE, (ev, { id }) => {
    ids = ids.filter((idIn) => idIn !== id);
  });
  ipcMain.on(IPC.BEFORE_CLOSE_DONE, (ev, { id }) => {
    ids = ids.filter((idIn) => idIn !== id);
    log(IPC.BEFORE_CLOSE_DONE, id, ids);
    if (ids.length === 0) {
      mainWin.close();
    }
  });

  mainWin.on('close', (event) => {
    // NOTE: this might not work if we run a second instance of the app
    log('close, isQuiting:', (app as any).isQuiting);
    if (!(app as any).isQuiting) {
      event.preventDefault();
      getSettings(mainWin, (appCfg: GlobalConfigState) => {
        if (appCfg && appCfg.misc.isMinimizeToTray && !(app as any).isQuiting) {
          mainWin.hide();
          return;
        }

        if (ids.length > 0) {
          log('Actions to wait for ', ids);
          mainWin.webContents.send(IPC.NOTIFY_ON_CLOSE, ids);
        } else {
          _quitApp();
        }
      });
    }
  });

  mainWin.webContents.on('render-process-gone', (event, detailed) => {
    log('!crashed, reason: ' + detailed.reason + ', exitCode = ' + detailed.exitCode);
    if (detailed.reason == 'crashed') {
      process.exit(detailed.exitCode);
      // relaunch app
      // app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) });
      // app.exit(0);
    }
  });
};

const appMinimizeHandler = (app: App): void => {
  if (!(app as any).isQuiting) {
    // TODO find reason for the typing error
    // @ts-ignore
    mainWin.on('minimize', (event: Event) => {
      getSettings(mainWin, (appCfg: GlobalConfigState) => {
        if (appCfg.misc.isMinimizeToTray) {
          event.preventDefault();
          mainWin.hide();
        } else if (IS_MAC) {
          app.dock.show();
        }
      });
    });
  }
};

const upsertKeyValue = <T>(obj: T, keyToChange: string, value: string[]): T => {
  const keyToChangeLower = keyToChange.toLowerCase();
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === keyToChangeLower) {
      // Reassign old key
      obj[key] = value;
      // Done
      return;
    }
  }
  // Insert at end instead
  obj[keyToChange] = value;
};

const removeKeyInAnyCase = <T>(obj: T, keyToRemove: string): T => {
  const keyToRemoveLower = keyToRemove.toLowerCase();
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === keyToRemoveLower) {
      delete obj[key];
      return;
    }
  }
};
