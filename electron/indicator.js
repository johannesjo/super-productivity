const electron = require('electron');
const dbus = require('./dbus');
const fs = require('fs');
const moment = require('moment');

let tray;
let isIndicatorRunning = false;
let isGnomeShellExtensionRunning = false;

function init(params) {
  const IS_LINUX = params.IS_LINUX;
  const IS_GNOME = params.IS_GNOME;
  const mainWin = params.mainWin;
  const showApp = params.showApp;
  const quitApp = params.quitApp;
  const IS_MAC = params.IS_MAC;
  const app = params.app;
  const ICONS_FOLDER = params.ICONS_FOLDER;
  const isGnomeShellExtensionInstalled = isGnomeShellInstalled(IS_LINUX, IS_GNOME);

  initAppListeners(app);
  initListeners(isGnomeShellExtensionInstalled);

  // if we have the gnome shell extension installed set up bus
  if (isGnomeShellExtensionInstalled) {
    dbus.init({
      mainWin,
      quitApp,
      showApp,
    });
    dbus.setMainWindow(mainWin);
    isGnomeShellExtensionRunning = true;
    return;
  }

  // don't start anything on GNOME as the indicator might not be visible and
  // the quiting behaviour confusing
  else if (IS_GNOME) {
    return;
  }

  // otherwise create a regular tray icon
  else {
    // switch tray icon based on
    let trayIcoFile;
    if (IS_MAC) {
      trayIcoFile = 'tray-ico-dark.png'
    } else {
      trayIcoFile = 'tray-ico.png'
    }

    tray = new electron.Tray(ICONS_FOLDER + trayIcoFile);

    tray.setContextMenu(createContextMenu(showApp, quitApp));

    tray.on('click', () => {
      showApp();
    });
    isIndicatorRunning = true;
    return tray;
  }
}

function isGnomeShellInstalled(IS_LINUX, IS_GNOME) {
  // check if shell extension is installed
  let isGnomeShellExtInstalled = false;
  if (IS_LINUX && IS_GNOME) {
    const LINUX_HOME_DIR = process.env['HOME'];
    if (fs.existsSync(LINUX_HOME_DIR + '/.local/share/gnome-shell/extensions/indicator@johannes.super-productivity.com')) {
      isGnomeShellExtInstalled = true;
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
  electron.ipcMain.on('CHANGED_CURRENT_TASK', (ev, params) => {
    const currentTask = params.current;
    const lastCurrentTask = params.lastCurrent;

    if (currentTask && currentTask.title) {
      const msg = createIndicatorStr(currentTask);

      if (tray) {
        tray.setTitle(msg);
      }
      if (isGnomeShellExtInstalled) {
        dbus.setTask(currentTask.id, msg);
      }
    } else if (isGnomeShellExtInstalled && !currentTask && lastCurrentTask && !lastCurrentTask.isDone) {
      const msg = createIndicatorStr(lastCurrentTask);
      dbus.setTask('PAUSED', msg);
    } else {
      if (isGnomeShellExtInstalled) {
        dbus.setTask('NONE', 'NONE');
      }
    }
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

    if (task.timeSpent && task.timeSpent._data) {
      task.timeSpent = moment.duration(task.timeSpent._data);
      timeStr += parseInt(task.timeSpent.asMinutes()).toString();
    }
    task.timeEstimate = task.timeEstimate && moment.duration(task.timeEstimate._data);
    const timeEstimateAsMin = moment.duration(task.timeEstimate).asMinutes();
    if (task.timeEstimate && timeEstimateAsMin > 0) {
      timeStr += '/' + timeEstimateAsMin;
    }

    msg = title + ' | ' + timeStr + 'm ';
    return msg;
  }
}

function createContextMenu(showApp, quitApp) {
  return electron.Menu.buildFromTemplate([
    {
      label: 'Show App', click: showApp
    },
    {
      label: 'Quit', click: quitApp
    }
  ]);
}

function isRunning() {
  return isIndicatorRunning || isGnomeShellExtensionRunning;
}

module.exports = {
  init,
  isRunning,
};