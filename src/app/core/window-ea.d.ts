import { ElectronAPI } from '../../../electron/electronAPI';

declare global {
  interface Window {
    ea?: ElectronAPI;
  }
}

export {};
