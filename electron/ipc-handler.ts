// FRONTEND EVENTS
// ---------------
import { app, dialog, globalShortcut, ipcMain, IpcMainEvent, shell } from 'electron';
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
import { loadSimpleStoreAll, saveSimpleStore } from './simple-store';
import { BACKUP_DIR, BACKUP_DIR_WINSTORE } from './backup';

export const initIpcInterfaces = (): void => {
  // HANDLER
  // -------
  ipcMain.handle(IPC.GET_PATH, (ev, name: string) => {
    return app.getPath(name as any);
  });
  ipcMain.handle(IPC.GET_BACKUP_PATH, () => {
    if (process?.windowsStore) {
      return BACKUP_DIR_WINSTORE;
    } else {
      return BACKUP_DIR;
    }
  });

  // BACKEND EVENTS
  // --------------
  // ...

  // ON EVENTS
  // ---------
  ipcMain.on(IPC.SHUTDOWN_NOW, quitApp);
  ipcMain.on(IPC.EXIT, (ev, exitCode: number) => app.exit(exitCode));
  ipcMain.on(IPC.RELAUNCH, () => app.relaunch());
  ipcMain.on(IPC.OPEN_DEV_TOOLS, () => getWin().webContents.openDevTools());
  ipcMain.on(
    IPC.SHOW_EMOJI_PANEL,
    () => app.isEmojiPanelSupported() && app.showEmojiPanel(),
  );
  ipcMain.on(IPC.RELOAD_MAIN_WIN, () => getWin().reload());
  ipcMain.on(IPC.OPEN_PATH, (ev, path: string) => shell.openPath(path));
  ipcMain.on(IPC.OPEN_EXTERNAL, (ev, url: string) => shell.openExternal(url));

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

  ipcMain.on(IPC.JIRA_SETUP_IMG_HEADERS, (ev, { jiraCfg }: { jiraCfg: JiraCfg }) => {
    setupRequestHeadersForImages(jiraCfg);
  });

  ipcMain.on(IPC.JIRA_MAKE_REQUEST_EVENT, (ev, request) => {
    sendJiraRequest(request);
  });

  ipcMain.on(IPC.SHOW_OR_FOCUS, () => {
    const mainWin = getWin();
    showOrFocus(mainWin);
  });

  ipcMain.on(IPC.EXEC, execWithFrontendErrorHandlerInform);

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
        .filter((key: string) =>
          GLOBAL_KEY_CFG_KEYS.includes(key as keyof KeyboardConfig),
        )
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
            try {
              const ret = globalShortcut.register(shortcut, actionFn) as unknown;
              if (!ret) {
                errorHandlerWithFrontendInform(
                  'Global Shortcut registration failed: ' + shortcut,
                  shortcut,
                );
              }
            } catch (e) {
              errorHandlerWithFrontendInform(
                'Global Shortcut registration failed: ' + shortcut,
                { e, shortcut },
              );
            }
          }
        });
    }
  }
};

const COMMAND_MAP_PROP = 'allowedCommands';

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
async function execWithFrontendErrorHandlerInform(
  ev: IpcMainEvent,
  command: string,
): Promise<void> {
  log('trying to run command ' + command);
  const existingData = await loadSimpleStoreAll();
  const allowedCommands: string[] = (existingData[COMMAND_MAP_PROP] as string[]) || [];

  if (!Array.isArray(allowedCommands)) {
    throw new Error('allowedCommands is no array ???');
  }
  if (allowedCommands.includes(command)) {
    exec(command, (err) => {
      if (err) {
        errorHandlerWithFrontendInform(err);
      }
    });
  } else {
    const mainWin = getWin();
    const res = await dialog.showMessageBox(mainWin, {
      type: 'question',
      buttons: ['Cancel', 'Yes, execute!'],
      defaultId: 2,
      title: 'Super Productivity – Exec',
      message:
        'Do you want to execute this command? ONLY confirm if you are sure you know what you are doing!!',
      detail: command,
      checkboxLabel: 'Remember my answer',
      checkboxChecked: true,
    });
    const { response, checkboxChecked } = res;

    if (response === 1) {
      if (checkboxChecked) {
        await saveSimpleStore(COMMAND_MAP_PROP, [...allowedCommands, command]);
      }
      exec(command, (err) => {
        if (err) {
          errorHandlerWithFrontendInform(err);
        }
      });
    }
  }
}
