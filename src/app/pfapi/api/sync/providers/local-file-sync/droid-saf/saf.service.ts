/* eslint-disable */
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Define the plugin interface for SAF operations
export interface SafPlugin {
  selectFolder(): Promise<{ uri: string }>;

  readFile(options: { uri: string; fileName: string }): Promise<{ data: string }>;

  writeFile(options: {
    uri: string;
    fileName: string;
    data: string;
  }): Promise<{ success: boolean }>;

  deleteFile(options: { uri: string; fileName: string }): Promise<{ success: boolean }>;

  checkFileExists(options: {
    uri: string;
    fileName: string;
  }): Promise<{ exists: boolean }>;

  checkUriPermission(options: { uri: string }): Promise<{ hasPermission: boolean }>;
}

// Register the plugin
const SafBridge = registerPlugin<SafPlugin>('SafBridge', {
  web: {
    async selectFolder() {
      throw new Error('SAF is not supported on web platform');
    },
    async readFile() {
      throw new Error('SAF is not supported on web platform');
    },
    async writeFile() {
      throw new Error('SAF is not supported on web platform');
    },
    async deleteFile() {
      throw new Error('SAF is not supported on web platform');
    },
    async checkFileExists() {
      throw new Error('SAF is not supported on web platform');
    },
    async checkUriPermission() {
      throw new Error('SAF is not supported on web platform');
    },
  },
});

export class SafService {
  private static readonly SAF_URI_KEY = 'saf_folder_uri';
  private static readonly SAF_ENABLED_KEY = 'saf_enabled';

  static async isAndroid(): Promise<boolean> {
    return Capacitor.getPlatform() === 'android';
  }

  static async isEnabled(): Promise<boolean> {
    if (!(await this.isAndroid())) {
      return false;
    }
    const result = await Preferences.get({ key: this.SAF_ENABLED_KEY });
    return result.value === 'true';
  }

  static async setEnabled(enabled: boolean): Promise<void> {
    await Preferences.set({
      key: this.SAF_ENABLED_KEY,
      value: enabled.toString(),
    });
  }

  static async selectFolder(): Promise<string> {
    if (!(await this.isAndroid())) {
      throw new Error('SAF is only supported on Android');
    }

    const result = await SafBridge.selectFolder();
    await this.saveFolderUri(result.uri);
    return result.uri;
  }

  static async getSavedFolderUri(): Promise<string | null> {
    const result = await Preferences.get({ key: this.SAF_URI_KEY });
    return result.value;
  }

  static async saveFolderUri(uri: string): Promise<void> {
    await Preferences.set({
      key: this.SAF_URI_KEY,
      value: uri,
    });
  }

  static async clearFolderUri(): Promise<void> {
    await Preferences.remove({ key: this.SAF_URI_KEY });
    await this.setEnabled(false);
  }

  static async checkPermission(): Promise<boolean> {
    const uri = await this.getSavedFolderUri();
    if (!uri) {
      return false;
    }

    try {
      const result = await SafBridge.checkUriPermission({ uri });
      return result.hasPermission;
    } catch (error) {
      console.error('Error checking SAF permission:', error);
      return false;
    }
  }

  static async readFile(fileName: string): Promise<string> {
    const uri = await this.getSavedFolderUri();
    if (!uri) {
      throw new Error('No SAF folder selected');
    }

    const result = await SafBridge.readFile({ uri, fileName });
    return result.data;
  }

  static async writeFile(fileName: string, data: string): Promise<void> {
    const uri = await this.getSavedFolderUri();
    if (!uri) {
      throw new Error('No SAF folder selected');
    }

    await SafBridge.writeFile({ uri, fileName, data });
  }

  static async deleteFile(fileName: string): Promise<void> {
    const uri = await this.getSavedFolderUri();
    if (!uri) {
      throw new Error('No SAF folder selected');
    }

    await SafBridge.deleteFile({ uri, fileName });
  }

  static async checkFileExists(fileName: string): Promise<boolean> {
    const uri = await this.getSavedFolderUri();
    if (!uri) {
      return false;
    }

    try {
      const result = await SafBridge.checkFileExists({ uri, fileName });
      return result.exists;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }
}
