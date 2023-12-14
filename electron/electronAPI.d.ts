import { IpcRenderer, OpenExternalOptions, WebFrame } from 'electron';

export interface ElectronAPI {
  ipcRenderer: () => IpcRenderer;

  setZoomFactor(zoomFactor: number): void;
  getZoomFactor(): number;
  openPath(path: string): Promise<string>;
  openExternal(url: string, options?: OpenExternalOptions): Promise<void>;
}
