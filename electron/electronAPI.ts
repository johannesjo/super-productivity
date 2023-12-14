import { IpcRenderer, OpenExternalOptions, ipcRenderer, webFrame, shell } from 'electron';
import { ElectronAPI } from './electronAPI.d';

export const electronAPI: Partial<ElectronAPI> = {
  // TODO use full
  // const electronAPI: ElectronAPI = {
  ipcRenderer: (): IpcRenderer => ipcRenderer,
  setZoomFactor: (zoomFactor: number) => {
    webFrame.setZoomFactor(zoomFactor);
  },
  getZoomFactor: () => webFrame.getZoomFactor(),
  openPath: (path: string) => shell.openPath(path),
  openExternal: (url: string, options?: OpenExternalOptions) => shell.openExternal(url),
};
