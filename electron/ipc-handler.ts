// FRONTEND EVENTS
// ---------------
import { app, globalShortcut, ipcMain, IpcMainEvent, systemPreferences } from 'electron';
import { IPC } from './shared-with-frontend/ipc-events.const';
import { lockscreen } from './lockscreen';
import { errorHandlerWithFrontendInform } from './error-handler-with-frontend-inform';
import { JiraCfg } from '../src/app/features/issue/providers/jira/jira.model';
import { sendJiraRequest, setupRequestHeadersForImages } from './jira';
import { KeyboardConfig } from '../src/app/features/config/keyboard-config.model';
import { log } from 'electron-log/main';
import { exec } from 'child_process';
import { getWin } from './main-window';
import { quitApp, showOrFocus } from './various-shared';

// HANDLER
// -------
ipcMain.handle(IPC.GET_PATH, (ev, name: string) => {
  return app.getPath(name as any);
});

// BACKEND EVENTS
// --------------

if (process.platform === 'darwin') {
  // nativeTheme.on('updated', () => {});
  systemPreferences.subscribeNotification(
    'AppleInterfaceThemeChangedNotification',
    () => {
      getWin().webContents.send(IPC.MAC_OS_THEME_UPDATED);
    },
  );
}

// ON EVENTS
// ---------
ipcMain.on(IPC.SHUTDOWN_NOW, quitApp);
ipcMain.on(IPC.EXIT, (ev, exitCode: number) => app.exit(exitCode));
ipcMain.on(IPC.RELAUNCH, () => app.relaunch());
ipcMain.on(IPC.OPEN_DEV_TOOLS, () => getWin().webContents.openDevTools());
ipcMain.on(IPC.RELOAD_MAIN_WIN, () => getWin().reload());

// TODO check
ipcMain.on(IPC.EXEC, execWithFrontendErrorHandlerInform);

ipcMain.on(IPC.LOCK_SCREEN, () => {
  if ((app as any).isLocked) {
    return;
  }

  try {
    lockscreen();
  } catch (e) {
    errorHandlerWithFrontendInform(e);
  }
});

ipcMain.on(IPC.SET_PROGRESS_BAR, (ev, { progress, mode }) => {
  const mainWin = getWin();
  if (mainWin) {
    mainWin.setProgressBar(Math.min(Math.max(progress, 0), 1), { mode });
  }
});

ipcMain.on(IPC.FLASH_FRAME, (ev) => {
  const mainWin = getWin();
  if (mainWin) {
    mainWin.flashFrame(false);
    mainWin.flashFrame(true);

    mainWin.once('focus', () => {
      mainWin.flashFrame(false);
    });
  }
});

ipcMain.on(IPC.REGISTER_GLOBAL_SHORTCUTS_EVENT, (ev, cfg) => {
  registerShowAppShortCuts(cfg);
});

ipcMain.on(
  IPC.JIRA_SETUP_IMG_HEADERS,
  (ev, { jiraCfg, wonkyCookie }: { jiraCfg: JiraCfg; wonkyCookie?: string }) => {
    setupRequestHeadersForImages(jiraCfg, wonkyCookie);
  },
);

ipcMain.on(IPC.JIRA_MAKE_REQUEST_EVENT, (ev, request) => {
  sendJiraRequest(request);
});

ipcMain.on(IPC.SHOW_OR_FOCUS, () => {
  const mainWin = getWin();
  showOrFocus(mainWin);
});

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function registerShowAppShortCuts(cfg: KeyboardConfig): void {
  // unregister all previous
  globalShortcut.unregisterAll();
  const GLOBAL_KEY_CFG_KEYS: (keyof KeyboardConfig)[] = [
    'globalShowHide',
    'globalToggleTaskStart',
    'globalAddNote',
    'globalAddTask',
  ];

  if (cfg) {
    const mainWin = getWin();
    Object.keys(cfg)
      .filter((key: string) => GLOBAL_KEY_CFG_KEYS.includes(key as keyof KeyboardConfig))
      .forEach((key: string) => {
        let actionFn: () => void;
        const shortcut = cfg[key as keyof KeyboardConfig];

        switch (key) {
          case 'globalShowHide':
            actionFn = () => {
              if (mainWin.isFocused()) {
                // we need to blur the window for windows
                mainWin.blur();
                mainWin.hide();
              } else {
                showOrFocus(mainWin);
              }
            };
            break;

          case 'globalToggleTaskStart':
            actionFn = () => {
              mainWin.webContents.send(IPC.TASK_TOGGLE_START);
            };
            break;

          case 'globalAddNote':
            actionFn = () => {
              showOrFocus(mainWin);
              mainWin.webContents.send(IPC.ADD_NOTE);
            };
            break;

          case 'globalAddTask':
            actionFn = () => {
              showOrFocus(mainWin);
              // NOTE: delay slightly to make sure app is ready
              mainWin.webContents.send(IPC.ADD_TASK);
            };
            break;

          default:
            actionFn = () => undefined;
        }

        if (shortcut && shortcut.length > 0) {
          const ret = globalShortcut.register(shortcut, actionFn) as unknown;
          if (!ret) {
            errorHandlerWithFrontendInform(
              'Global Shortcut registration failed: ' + shortcut,
              shortcut,
            );
          }
        }
      });
  }
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function execWithFrontendErrorHandlerInform(ev: IpcMainEvent, command: string): void {
  log('running command ' + command);
  exec(command, (err) => {
    if (err) {
      errorHandlerWithFrontendInform(err);
    }
  });
}
