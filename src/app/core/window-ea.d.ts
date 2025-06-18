// Type definitions for window.ea (ElectronAPI)
// This file ensures proper typing for Electron API access

import { ElectronAPI } from '../../../electron/electronAPI';

// Extend the existing Window interface declaration
// Note: In test environment, this is declared as required in test.ts
// In runtime, this may be undefined in web context
declare global {
  interface Window {
    ea?: ElectronAPI | undefined;
  }
}

export {};
