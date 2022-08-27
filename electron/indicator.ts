import { App, ipcMain, Menu, nativeTheme, Tray } from 'electron';
import { IPC } from './shared-with-frontend/ipc-events.const';
import { getSettings } from './get-settings';
import { getWin } from './main-window';
import { GlobalConfigState } from '../src/app/features/config/global-config.model';
import { TaskCopy } from '../src/app/features/tasks/task.model';
import { release } from 'os';

let tray: Tray;
let DIR: string;
let shouldUseDarkColors: boolean;
const IS_MAC = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
const IS_WINDOWS = process.platform === 'win32';

export const initIndicator = ({
  showApp,
  quitApp,
  app,
  ICONS_FOLDER,
  forceDarkTray,
}: {
  showApp: () => void;
  quitApp: () => void;
  app: App;
  ICONS_FOLDER: string;
  forceDarkTray: boolean;
}): Tray => {
  DIR = ICONS_FOLDER + 'indicator/';
  shouldUseDarkColors =
    forceDarkTray ||
    IS_LINUX ||
    (IS_WINDOWS && !isWindows11()) ||
    nativeTheme.shouldUseDarkColors;

  initAppListeners(app);
  initListeners();

  const suf = shouldUseDarkColors ? '-d.png' : '-l.png';
  tray = new Tray(DIR + `stopped${suf}`);
  tray.setContextMenu(createContextMenu(showApp, quitApp));

  tray.on('click', () => {
    showApp();
  });
  return tray;
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function initAppListeners(app: App): void {
  if (tray) {
    app.on('before-quit', () => {
      if (tray) {
        tray.destroy();
      }
    });
  }
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function initListeners(): void {
  ipcMain.on(IPC.SET_PROGRESS_BAR, (ev, { progress }) => {
    const suf = shouldUseDarkColors ? '-d' : '-l';
    if (typeof progress === 'number' && progress > 0 && isFinite(progress)) {
      const f = Math.min(Math.round(progress * 15), 15);
      const t = DIR + `running-anim${suf}/${f || 0}.png`;
      setTrayIcon(tray, t);
    } else {
      const t = DIR + `running${suf}.png`;
      setTrayIcon(tray, t);
    }
  });

  ipcMain.on(IPC.CURRENT_TASK_UPDATED, (ev, params) => {
    const currentTask = params.current;
    const mainWin = getWin();
    getSettings(mainWin, (settings: GlobalConfigState) => {
      const isTrayShowCurrentTask = settings.misc.isTrayShowCurrentTask;

      const msg =
        isTrayShowCurrentTask && currentTask ? createIndicatorStr(currentTask) : '';

      if (tray) {
        // tray handling
        if (currentTask && currentTask.title) {
          tray.setTitle(msg);
          if (!IS_MAC) {
            // NOTE apparently this has no effect for gnome
            tray.setToolTip(msg);
          }
        } else {
          tray.setTitle('');
          if (!IS_MAC) {
            // NOTE apparently this has no effect for gnome
            tray.setToolTip(msg);
          }
          const suf = shouldUseDarkColors ? '-d.png' : '-l.png';
          setTrayIcon(tray, DIR + `stopped${suf}`);
        }
      }
    });
  });

  // ipcMain.on(IPC.POMODORO_UPDATE, (ev, params) => {
  // const isOnBreak = params.isOnBreak;
  // const currentSessionTime = params.currentSessionTime;
  // const currentSessionInitialTime = params.currentSessionInitialTime;
  // if (isGnomeShellExtInstalled) {
  //  dbus.updatePomodoro(isOnBreak, currentSessionTime, currentSessionInitialTime);
  // }
  // });
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function createIndicatorStr(task: TaskCopy): string {
  if (task && task.title) {
    let title = task.title;
    // let timeStr = '';
    // let msg;
    if (title.length > 40) {
      title = title.substring(0, 37) + '...';
    }
    return title;

    // if (task.timeSpent) {
    //   const timeSpentAsMinutes = Math.round(task.timeSpent / 60 / 1000);
    //   timeStr += timeSpentAsMinutes.toString();
    // }
    // const timeEstimateAsMin = Math.round(task.timeEstimate / 60 / 1000);
    //
    // if (task.timeEstimate && timeEstimateAsMin > 0) {
    //   timeStr += '/' + timeEstimateAsMin;
    // }
    //
    // msg = title + ' | ' + timeStr + 'm ';
    // return msg;
  }

  // NOTE: we need to make sure that this is always a string
  return '';
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function createContextMenu(showApp: () => void, quitApp: () => void): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: showApp,
    },
    {
      label: 'Quit',
      click: quitApp,
    },
  ]);
}

let curIco: string;

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function setTrayIcon(tr: Tray, icoPath: string): void {
  if (icoPath !== curIco) {
    curIco = icoPath;
    tr.setImage(icoPath);
  }
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function isWindows11(): boolean {
  if (process.platform !== 'win32') {
    return false;
  }

  const v = release();
  let isWin11 = false;
  if (v.startsWith('11.')) {
    isWin11 = true;
  } else if (v.startsWith('10.')) {
    const ss = v.split('.');
    isWin11 = ss.length > 2 && parseInt(ss[2]) >= 22000 ? true : false;
  }

  return isWin11;
}
