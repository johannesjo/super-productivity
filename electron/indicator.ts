import { App, ipcMain, Menu, nativeTheme, Tray } from 'electron';
// const dbus = require('./dbus');
import { IPC } from './ipc-events.const';
import { getSettings } from './get-settings';
import { getWin } from './main-window';

let tray;
let isIndicatorRunning = false;
let DIR: string;
let isTrayShowCurrentTask: boolean;

const isGnomeShellExtensionRunning = false;

export const initIndicator = ({
  IS_LINUX,
  IS_GNOME,
  IS_MAC,
  showApp,
  quitApp,
  app,
  ICONS_FOLDER,
}: {
  IS_LINUX: boolean;
  IS_GNOME: boolean;
  IS_MAC: boolean;
  showApp: () => void;
  quitApp: () => void;
  app: App;
  ICONS_FOLDER: string;
}) => {
  DIR = ICONS_FOLDER + 'indicator/';

  initAppListeners(app);
  initListeners();

  const suf = nativeTheme.shouldUseDarkColors
    ? '-d.png'
    : '-l.png';
  tray = new Tray(DIR + `stopped${suf}`);
  tray.setContextMenu(createContextMenu(showApp, quitApp));

  tray.on('click', () => {
    showApp();
  });
  isIndicatorRunning = true;
  return tray;
  // }
};

function initAppListeners(app) {
  if (tray) {
    app.on('before-quit', () => {
      if (tray) {
        tray.destroy();
      }
    });
  }
}

function initListeners() {
  ipcMain.on(IPC.CURRENT_TASK_UPDATED, (ev, params) => {
    const currentTask = params.current;
    // const lastActiveTaskTask = params.lastActiveTask;

    const mainWin = getWin();
    getSettings(mainWin, (settings) => {
      isTrayShowCurrentTask = settings.misc.isTrayShowCurrentTask;
    });

    let msg = '';
    if (isTrayShowCurrentTask && currentTask) {
      msg = createIndicatorStr(currentTask);
    }

    if (tray) {
      // tray handling
      if (currentTask && currentTask.title) {
        const suf = nativeTheme.shouldUseDarkColors
          ? '-d'
          : '-l';
        tray.setTitle(msg);
        if (typeof currentTask.timeEstimate === 'number' && currentTask.timeEstimate > 0) {
          const progress = currentTask.timeSpent / currentTask.timeEstimate;
          const f = Math.min(Math.round(progress * 15), 15);
          const t = DIR + `running-anim${suf}/${f || 0}.png`;
          tray.setImage(t);
        } else {
          const t = DIR + `running${suf}.png`;
          tray.setImage(t);
        }
      } else {
        tray.setTitle('');
        const suf = nativeTheme.shouldUseDarkColors
          ? '-d.png'
          : '-l.png';
        tray.setImage(DIR + `stopped${suf}`);
      }
    }
  });

  ipcMain.on(IPC.POMODORO_UPDATE, (ev, params) => {
    // const isOnBreak = params.isOnBreak;
    // const currentSessionTime = params.currentSessionTime;
    // const currentSessionInitialTime = params.currentSessionInitialTime;

    // if (isGnomeShellExtInstalled) {
    //  dbus.updatePomodoro(isOnBreak, currentSessionTime, currentSessionInitialTime);
    // }
  });
}

function createIndicatorStr(task) {
  if (task && task.title) {
    let title = task.title;
    let timeStr = '';
    let msg;

    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }

    // TODO replace with our format helpers once we have ts support
    if (task.timeSpent) {
      const timeSpentAsMinutes = Math.round(task.timeSpent / 60 / 1000);
      timeStr += timeSpentAsMinutes.toString();
    }
    const timeEstimateAsMin = Math.round(task.timeEstimate / 60 / 1000);

    if (task.timeEstimate && timeEstimateAsMin > 0) {
      timeStr += '/' + timeEstimateAsMin;
    }

    msg = title + ' | ' + timeStr + 'm ';
    return msg;
  }
}

function createContextMenu(showApp, quitApp) {
  return Menu.buildFromTemplate([
    {
      label: 'Show App', click: showApp
    },
    {
      label: 'Quit', click: quitApp
    }
  ]);
}

export const isRunning = () => {
  return isIndicatorRunning || isGnomeShellExtensionRunning;
};
