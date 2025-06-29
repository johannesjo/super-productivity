import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('overlayAPI', {
  setIgnoreMouseEvents: (ignore: boolean) => {
    ipcRenderer.send('overlay-set-ignore-mouse', ignore);
  },
  showMainWindow: () => {
    ipcRenderer.send('overlay-show-main-window');
  },
  onUpdateContent: (callback: (data: any) => void) => {
    const listener = (event: Electron.IpcRendererEvent, data: any): void =>
      callback(data);
    ipcRenderer.on('update-content', listener);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('update-content', listener);
    };
  },
});
