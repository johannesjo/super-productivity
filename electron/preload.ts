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

const send: (channel: IPCEventValue, ...args: any[]) => void = (channel, ...args) =>
  ipcRenderer.send(channel, ...args);
const invoke: (channel: IPCEventValue, ...args: any[]) => Promise<unknown> = (
  channel,
  ...args
) => ipcRenderer.invoke(channel, ...args);

const electronAPI: Partial<ElectronAPI> = {
  // TODO use full interface
  // const electronAPI: ElectronAPI = {

  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),

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

  getUserDataPath: () => invoke('GET_PATH', 'userData') as Promise<string>,
  relaunch: () => send('RELAUNCH'),
  exit: () => send('EXIT'),
  reloadMainWin: () => send('RELOAD_MAIN_WIN'),
  openDevTools: () => send('OPEN_DEV_TOOLS'),

  // ALL EVENTS
  scheduleRegisterBeforeClose: (id) => send('REGISTER_BEFORE_CLOSE', { id }),
  unscheduleRegisterBeforeClose: (id) => send('UNREGISTER_BEFORE_CLOSE', { id }),
  setDoneRegisterBeforeClose: (id) => send('BEFORE_CLOSE_DONE', { id }),
};
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// contextBridge.exposeInIsolatedWorld();
console.log('preload script loading complete');
