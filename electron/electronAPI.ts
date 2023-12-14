import {
  app,
  IpcRenderer,
  ipcRenderer,
  IpcRendererEvent,
  nativeTheme,
  OpenExternalOptions,
  shell,
  webFrame,
} from 'electron';
import { ElectronAPI } from './electronAPI.d';
import { getWin } from './main-window';

export const electronAPI: Partial<ElectronAPI> = {
  // TODO use full interface
  // const electronAPI: ElectronAPI = {
  ipcRenderer: (): IpcRenderer => ipcRenderer,

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
  reloadMainWin: () => getWin().reload(),
  openDevTools: () => getWin().webContents.openDevTools(),
  relaunch: () => app.relaunch(),
  exit: (exitCode: number) => app.exit(exitCode),
  isSystemDarkMode: () => nativeTheme.shouldUseDarkColors,
};
