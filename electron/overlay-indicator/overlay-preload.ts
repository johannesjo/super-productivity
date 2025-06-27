import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('overlayAPI', {
  setIgnoreMouseEvents: (ignore: boolean) => {
    ipcRenderer.send('overlay-set-ignore-mouse', ignore);
  },
  showMainWindow: () => {
    ipcRenderer.send('overlay-show-main-window');
  },
  onUpdateContent: (callback: (data: any) => void) => {
    ipcRenderer.on('update-content', (event, data) => callback(data));
  },
});
