import { App, ipcMain, Menu, nativeTheme, Tray } from 'electron';
// const dbus = require('./dbus');
import { IPC } from './ipc-events.const';
import { getSettings } from './get-settings';
import { getWin } from './main-window';

let tray;
let isIndicatorRunning = false;
let DIR: string;

const isGnomeShellExtensionRunning = false;

export const initIndicator = ({
  showApp,
  quitApp,
  app,
  ICONS_FOLDER,
}: {
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
  ipcMain.on(IPC.SET_PROGRESS_BAR, (ev, {progress}) => {
    const suf = nativeTheme.shouldUseDarkColors
      ? '-d'
      : '-l';
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
    getSettings(mainWin, (settings) => {
      const isTrayShowCurrentTask = settings.misc.isTrayShowCurrentTask;

      let msg = '';
      if (isTrayShowCurrentTask && currentTask) {
        msg = createIndicatorStr(currentTask);
      }

      if (tray) {
        // tray handling
        if (currentTask && currentTask.title) {
          tray.setTitle(msg);
        } else {
          tray.setTitle('');
          const suf = nativeTheme.shouldUseDarkColors
            ? '-d.png'
            : '-l.png';
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

function createIndicatorStr(task): string {
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

let curIco: string;
function setTrayIcon(tr: Tray, icoPath: string) {
  if (icoPath !== curIco) {
    curIco = icoPath;
    tr.setImage(icoPath);
  }
}
