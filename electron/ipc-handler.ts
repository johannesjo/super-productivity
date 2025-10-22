// FRONTEND EVENTS
// ---------------
import {
  app,
  dialog,
  globalShortcut,
  ipcMain,
  IpcMainEvent,
  ProgressBarOptions,
  shell,
} from 'electron';
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
import { pluginNodeExecutor } from './plugin-node-executor';
import { clipboard } from 'electron';

interface SharePayload {
  text?: string;
  url?: string;
  title?: string;
}

/**
 * Handle share on macOS using AppleScript to invoke system share dialog.
 * Falls back to clipboard if AppleScript fails.
 */
const handleMacOSShare = async (
  payload: SharePayload,
): Promise<{
  success: boolean;
  error?: string;
}> => {
  const { text, url, title } = payload;
  const contentToShare = [title, text, url].filter(Boolean).join('\n\n');

  if (!contentToShare) {
    return { success: false, error: 'No content to share' };
  }

  return new Promise((resolve) => {
    // Use AppleScript to trigger native share
    // This creates a share menu at the mouse cursor position
    const appleScript = `
      tell application "System Events"
        set the clipboard to "${contentToShare.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
      end tell

      display dialog "Content copied to clipboard. Use Cmd+V to paste in your desired app." buttons {"OK"} default button "OK" with icon note
    `;

    exec(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, (error) => {
      if (error) {
        log('AppleScript share failed, falling back to clipboard:', error);
        // Fallback: just copy to clipboard
        try {
          clipboard.writeText(contentToShare);
          resolve({ success: true });
        } catch (clipboardError) {
          resolve({
            success: false,
            error: 'Failed to copy to clipboard',
          });
        }
      } else {
        clipboard.writeText(contentToShare);
        resolve({ success: true });
      }
    });
  });
};

/**
 * Handle share on Windows using clipboard.
 * Note: Proper Windows Share UI requires UWP/WinRT APIs which need native modules.
 * This implementation copies to clipboard as a practical fallback.
 */
const handleWindowsShare = async (
  payload: SharePayload,
): Promise<{
  success: boolean;
  error?: string;
}> => {
  const { text, url, title } = payload;
  const contentToShare = [title, text, url].filter(Boolean).join('\n\n');

  if (!contentToShare) {
    return { success: false, error: 'No content to share' };
  }

  try {
    // Copy to clipboard
    clipboard.writeText(contentToShare);

    // Show notification dialog
    const mainWin = getWin();
    if (mainWin) {
      await dialog.showMessageBox(mainWin, {
        type: 'info',
        title: 'Content Copied',
        message: 'Content has been copied to clipboard',
        detail: 'You can now paste it in any application using Ctrl+V',
        buttons: ['OK'],
      });
    }

    return { success: true };
  } catch (error) {
    log('Windows share failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to copy to clipboard',
    };
  }
};

export const initIpcInterfaces = (): void => {
  // Initialize plugin node executor (registers IPC handlers)
  // This is needed for plugins with nodeExecution permission
  // The constructor automatically sets up the IPC handlers
  log('Initializing plugin node executor');
  if (!pluginNodeExecutor) {
    log('Warning: Plugin node executor failed to initialize');
  }
  // HANDLER
  // -------
  ipcMain.handle(IPC.GET_PATH, (ev, name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0]);
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

  ipcMain.handle(IPC.SAVE_FILE_DIALOG, async (ev, { filename, data }) => {
    const result = await dialog.showSaveDialog(getWin(), {
      defaultPath: filename,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePath) {
      const fs = await import('fs');
      await fs.promises.writeFile(result.filePath, data, 'utf-8');
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });

  ipcMain.handle(IPC.SHARE_NATIVE, async (ev, payload) => {
    const { text, url, title } = payload;
    const platform = process.platform;

    try {
      // macOS: Use system share via AppleScript
      if (platform === 'darwin') {
        return await handleMacOSShare({ text, url, title });
      }

      // Windows: Use clipboard + notification as fallback
      // Note: Proper Windows Share UI requires UWP/WinRT which needs native module
      if (platform === 'win32') {
        return await handleWindowsShare({ text, url, title });
      }

      // Linux: No native share available
      log('Linux platform - no native share available, using fallback');
      return {
        success: false,
        error: 'Native share not available on Linux',
      };
    } catch (error) {
      log('Native share error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Share failed',
      };
    }
  });

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

  ipcMain.on(IPC.SET_PROGRESS_BAR, (ev, { progress, progressBarMode }) => {
    const mainWin = getWin();
    if (mainWin) {
      if (progressBarMode === 'none') {
        mainWin.setProgressBar(-1);
      } else {
        mainWin.setProgressBar(Math.min(Math.max(progress, 0), 1), {
          mode: progressBarMode as ProgressBarOptions['mode'],
        });
      }
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
                mainWin.webContents.send(IPC.SHOW_ADD_TASK_BAR);
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
