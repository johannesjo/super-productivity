import { contextBridge, ipcRenderer, IpcRendererEvent, webFrame } from 'electron';
import { ElectronAPI } from './electronAPI.d';
import { IPCEventValue } from './shared-with-frontend/ipc-events.const';
import { LocalBackupMeta } from '../src/app/imex/local-backup/local-backup.model';
import { SyncGetRevResult } from '../src/app/imex/sync/sync.model';

const _send: (channel: IPCEventValue, ...args: any[]) => void = (channel, ...args) =>
  ipcRenderer.send(channel, ...args);
const _invoke: (channel: IPCEventValue, ...args: any[]) => Promise<unknown> = (
  channel,
  ...args
) => ipcRenderer.invoke(channel, ...args);

const ea: ElectronAPI = {
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
    // NOTE: there is no proper way to unsubscribe apart from unsusbscribing all
    ipcRenderer.on(channel, listener);
  },
  // INVOKE
  // ------
  getUserDataPath: () => _invoke('GET_PATH', 'userData') as Promise<string>,
  checkBackupAvailable: () =>
    _invoke('BACKUP_IS_AVAILABLE') as Promise<false | LocalBackupMeta>,
  loadBackupData: (backupPath) =>
    _invoke('BACKUP_LOAD_DATA', backupPath) as Promise<string>,
  fileSyncGetRevAndClientUpdate: (backupPath) =>
    _invoke('FILE_SYNC_GET_REV_AND_CLIENT_UPDATE', backupPath) as Promise<
      { rev: string; clientUpdate?: number } | SyncGetRevResult
    >,
  fileSyncSave: (backupPath) =>
    _invoke('FILE_SYNC_SAVE', backupPath) as Promise<string | Error>,
  fileSyncLoad: (backupPath) =>
    _invoke('FILE_SYNC_LOAD', backupPath) as Promise<{
      rev: string;
      dataStr: string | undefined;
    }>,
  isSystemDarkMode: () => _invoke('IS_SYSTEM_DARK_MODE') as Promise<boolean>,

  // STANDARD
  // --------
  setZoomFactor: (zoomFactor: number) => {
    webFrame.setZoomFactor(zoomFactor);
  },
  getZoomFactor: () => webFrame.getZoomFactor(),
  isMacOS: () => process.platform === 'darwin',

  // SEND
  // ----
  relaunch: () => _send('RELAUNCH'),
  exit: () => _send('EXIT'),
  flashFrame: () => _send('FLASH_FRAME'),
  showOrFocus: () => _send('SHOW_OR_FOCUS'),
  lockScreen: () => _send('LOCK_SCREEN'),
  shutdownNow: () => _send('SHUTDOWN_NOW'),
  reloadMainWin: () => _send('RELOAD_MAIN_WIN'),
  openDevTools: () => _send('OPEN_DEV_TOOLS'),
  informAboutAppReady: () => _send('APP_READY'),

  openPath: (path: string) => _send('OPEN_PATH', path),
  openExternalUrl: (url: string) => _send('OPEN_EXTERNAL', url),
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
contextBridge.exposeInMainWorld('ea', ea);

// contextBridge.exposeInIsolatedWorld();
console.log('preload script loading complete');
