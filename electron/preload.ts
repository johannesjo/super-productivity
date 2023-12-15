import {
  app,
  contextBridge,
  ipcRenderer,
  IpcRendererEvent,
  nativeTheme,
  OpenExternalOptions,
  shell,
  webFrame,
} from 'electron';
import { ElectronAPI } from './electronAPI.d';

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
  // TODO implement in a way that throws no error
  // reloadMainWin: () => getWin().reload(),
  // openDevTools: () => getWin().webContents.openDevTools(),
  reloadMainWin: () => undefined,
  openDevTools: () => undefined,
  // TODO implement
  relaunch: () => app.relaunch(),
  exit: (exitCode: number) => app.exit(exitCode),
  isSystemDarkMode: () => nativeTheme.shouldUseDarkColors,
  getUserDataPath: () => ipcRenderer.invoke('GET_PATH' /*IPC.GET_PATH*/, 'userData'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// contextBridge.exposeInIsolatedWorld();
console.log('preload script loading complete');
