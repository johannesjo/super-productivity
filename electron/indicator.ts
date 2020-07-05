import { App, ipcMain, Menu, Tray } from 'electron';
import { existsSync, readFileSync } from 'fs';
// const dbus = require('./dbus');
import { errorHandler } from './error-handler';
import { IPC } from './ipc-events.const';

const GNOME_SHELL_EXT_MIN_VERSION = 2;

let tray;
let isIndicatorRunning = false;
let isGnomeShellExtensionRunning = false;

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

  const isGnomeShellExtensionInstalled = isGnomeShellInstalled(IS_LINUX, IS_GNOME);

  initAppListeners(app);
  initListeners(isGnomeShellExtensionInstalled);

  // if we have the gnome shell extension installed set up bus
  if (IS_GNOME && isGnomeShellExtensionInstalled) {
    // TODO
    // dbus.init({
    //  quitApp,
    //  showApp,
    // });
    isGnomeShellExtensionRunning = true;
    return;
  } else if (IS_GNOME) {
    // don't start anything on GNOME as the indicator might not be visible and
    // the quiting behaviour confusing
    return;
  } else {
    // otherwise create a regular tray icon
    // switch tray icon based on
    let trayIcoFile;
    if (IS_MAC) {
      trayIcoFile = 'tray-icoTemplate.png';
    } else {
      trayIcoFile = 'tray-ico.png';
    }

    tray = new Tray(ICONS_FOLDER + trayIcoFile);

    tray.setContextMenu(createContextMenu(showApp, quitApp));

    tray.on('click', () => {
      showApp();
    });
    isIndicatorRunning = true;
    return tray;
  }
};

function isGnomeShellInstalled(IS_LINUX, IS_GNOME) {
  // check if shell extension is installed
  let isGnomeShellExtInstalled = false;
  if (IS_LINUX && IS_GNOME) {
    // tslint:disable-next-line
    const LINUX_HOME_DIR = process.env['HOME'];
    const EXTENSION_PATH = LINUX_HOME_DIR + '/.local/share/gnome-shell/extensions/indicator@johannes.super-productivity.com';

    if (existsSync(EXTENSION_PATH)) {
      const metaData = readFileSync(EXTENSION_PATH + '/metadata.json').toString();
      const version = JSON.parse(metaData).version;
      if (version >= GNOME_SHELL_EXT_MIN_VERSION) {
        isGnomeShellExtInstalled = true;
      } else {
        errorHandler('Indicator: Outdated version '
          + version
          + ' of Gnome Shell Extension installed. Please install at least version '
          + GNOME_SHELL_EXT_MIN_VERSION + '.');
      }
    }
  }
  return isGnomeShellExtInstalled;
}

function initAppListeners(app) {
  if (tray) {
    app.on('before-quit', () => {
      if (tray) {
        tray.destroy();
      }
    });
  }
}

function initListeners(isGnomeShellExtInstalled) {
  ipcMain.on(IPC.CURRENT_TASK_UPDATED, (ev, params) => {
    const currentTask = params.current;
    // const lastActiveTaskTask = params.lastActiveTask;

    let msg;

    if (currentTask) {
      msg = createIndicatorStr(currentTask);
    }

    // if (isGnomeShellExtInstalled) {
    //  // gnome indicator handling
    //  if (currentTask && currentTask.title) {
    //    dbus.setTask(currentTask.id, msg);
    //  } else if (!currentTask && lastActiveTaskTask && !lastActiveTaskTask.isDone) {
    //    const msg = createIndicatorStr(lastActiveTaskTask);
    //    dbus.setTask('PAUSED', msg);
    //  } else {
    //    dbus.setTask('NONE', 'NONE');
    //  }
    // } else
    //
    if (tray) {
      // tray handling
      if (currentTask && currentTask.title) {
        tray.setTitle(msg);
      } else {
        tray.setTitle('');
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

