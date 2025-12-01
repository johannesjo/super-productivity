// Type definitions for window.ea (ElectronAPI)
// This file ensures proper typing for Electron API access

import { ElectronAPI } from '../../../electron/electronAPI';

// Extend the existing Window interface declaration
declare global {
  interface Window {
    ea: ElectronAPI;
  }
}

export {};
