import { log } from 'electron-log/main';
import { pluginNodeExecutor } from './plugin-node-executor';
import { initAppDataIpc } from './ipc-handlers/app-data';
import { initAppControlIpc } from './ipc-handlers/app-control';
import { initSystemIpc } from './ipc-handlers/system';
import { initJiraIpc } from './ipc-handlers/jira';
import { initGlobalShortcutsIpc } from './ipc-handlers/global-shortcuts';
import { initExecIpc } from './ipc-handlers/exec';

export const initIpcInterfaces = (): void => {
  // Initialize plugin node executor (registers IPC handlers)
  // This is needed for plugins with nodeExecution permission
  // The constructor automatically sets up the IPC handlers
  log('Initializing plugin node executor');
  if (!pluginNodeExecutor) {
    log('Warning: Plugin node executor failed to initialize');
  }

  initAppDataIpc();
  initAppControlIpc();
  initSystemIpc();
  initJiraIpc();
  initGlobalShortcutsIpc();
  initExecIpc();
};
