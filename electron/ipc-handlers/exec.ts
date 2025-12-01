import { dialog, ipcMain, IpcMainEvent } from 'electron';
import { IPC } from '../shared-with-frontend/ipc-events.const';
import { exec } from 'child_process';
import { log } from 'electron-log/main';
import { loadSimpleStoreAll, saveSimpleStore } from '../simple-store';
import { getWin } from '../main-window';
import { errorHandlerWithFrontendInform } from '../error-handler-with-frontend-inform';
import { SimpleStoreKey } from '../shared-with-frontend/simple-store.const';

const COMMAND_MAP_PROP = SimpleStoreKey.ALLOWED_COMMANDS;

export const initExecIpc = (): void => {
  ipcMain.on(IPC.EXEC, execWithFrontendErrorHandlerInform);
};

const execWithFrontendErrorHandlerInform = async (
  ev: IpcMainEvent,
  command: string,
): Promise<void> => {
  log('trying to run command ' + command);
  const existingData = await loadSimpleStoreAll();
  const allowedCommands: string[] = (existingData[COMMAND_MAP_PROP] as string[]) || [];

  if (!Array.isArray(allowedCommands)) {
    throw new Error('Invalid configuration: allowedCommands must be an array');
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
};
