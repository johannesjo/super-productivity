// Type definitions for window.ea (ElectronAPI)
// This file ensures proper typing for Electron API access

import {
  ElectronAPI,
  QuickAddElectronApi,
  QuickAddElectronPlatformApi,
} from '../../../electron/electronAPI';

// Extend the existing Window interface declaration
declare global {
  interface Window {
    ea: ElectronAPI;
    quickAdd: QuickAddElectronApi;
    // Only present in the Quick Add HUD renderer; `src/main.ts` proxies it
    // into `window.ea` there.
    quickAddEa?: QuickAddElectronPlatformApi;
  }
}

export {};
