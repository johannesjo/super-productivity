import {
  contextBridge,
  ipcRenderer,
  IpcRendererEvent,
  nativeTheme,
  OpenExternalOptions,
  shell,
  webFrame,
} from 'electron';
import { ElectronAPI } from './electronAPI.d';
import { IPCEventValue } from './shared-with-frontend/ipc-events.const';

const _send: (channel: IPCEventValue, ...args: any[]) => void = (channel, ...args) =>
  ipcRenderer.send(channel, ...args);
const _invoke: (channel: IPCEventValue, ...args: any[]) => Promise<unknown> = (
  channel,
  ...args
) => ipcRenderer.invoke(channel, ...args);

const electronAPI: Partial<ElectronAPI> = {
  // TODO use full interface
  // const electronAPI: ElectronAPI = {

  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  off: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) =>
    ipcRenderer.off(channel, listener),

  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) =>
    ipcRenderer.on(channel, listener),

  once: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) =>
    ipcRenderer.once(channel, listener),

  setZoomFactor: (zoomFactor: number) => {
    webFrame.setZoomFactor(zoomFactor);
  },
  getZoomFactor: () => webFrame.getZoomFactor(),
  openPath: (path: string) => shell.openPath(path),
  openExternal: (url: string, options?: OpenExternalOptions) => shell.openExternal(url),
  isMacOS: () => process.platform === 'darwin',

  isSystemDarkMode: () => nativeTheme.shouldUseDarkColors,

  getUserDataPath: () => _invoke('GET_PATH', 'userData') as Promise<string>,
  relaunch: () => _send('RELAUNCH'),
  exit: () => _send('EXIT'),
  flashFrame: () => _send('FLASH_FRAME'),
  showOrFocus: () => _send('SHOW_OR_FOCUS'),
  lockScreen: () => _send('LOCK_SCREEN'),
  shutdownNow: () => _send('SHUTDOWN_NOW'),
  reloadMainWin: () => _send('RELOAD_MAIN_WIN'),
  openDevTools: () => _send('OPEN_DEV_TOOLS'),
  informAboutAppReady: () => _send('APP_READY'),

  // ALL EVENTS
  scheduleRegisterBeforeClose: (id) => _send('REGISTER_BEFORE_CLOSE', { id }),
  unscheduleRegisterBeforeClose: (id) => _send('UNREGISTER_BEFORE_CLOSE', { id }),
  setDoneRegisterBeforeClose: (id) => _send('BEFORE_CLOSE_DONE', { id }),

  setProgressBar: (args) => _send('SET_PROGRESS_BAR', args),

  sendAppSettingsToElectron: (globalCfg) =>
    _send('TRANSFER_SETTINGS_TO_ELECTRON', globalCfg),
  registerGlobalShortcuts: (keyboardCfg) =>
    _send('REGISTER_GLOBAL_SHORTCUTS', keyboardCfg),
  showFullScreenBlocker: (args) => _send('FULL_SCREEN_BLOCKER', args),

  makeJiraRequest: (args) => _send('JIRA_MAKE_REQUEST_EVENT', args),
  jiraSetupImgHeaders: (args) => _send('JIRA_SETUP_IMG_HEADERS', args),

  backupAppData: (appData) => _send('BACKUP', appData),

  updateCurrentTask: (task) => _send('CURRENT_TASK_UPDATED', task),

  // TODO make secure
  exec: () => _send('EXEC'),
};
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// contextBridge.exposeInIsolatedWorld();
console.log('preload script loading complete');
