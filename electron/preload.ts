import { contextBridge } from 'electron';
import { electronAPI } from './electronAPI';

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// contextBridge.exposeInIsolatedWorld();
console.log('XXXXXXXXXXXXXXXXxx preload complete');
