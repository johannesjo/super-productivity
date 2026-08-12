import type { PlatformPorts } from './index';
import { MemoryCredentials, type CredentialsStore } from './memory-credentials';

export type { CredentialsStore };

/**
 * Browser bindings for the platform port surface. Every capability degrades
 * gracefully when the host omits it (web/assistant/sandbox), and no user
 * content is logged. Tauri replaces this with native plugins in a separate
 * adapter; this file is the zero-dependency web default.
 */
export const createWebPlatformPorts = (
  credentials: CredentialsStore = new MemoryCredentials(),
): PlatformPorts => ({
  credentials: {
    get: (key) => credentials.get(key),
    set: (key, value) => credentials.set(key, value),
    remove: (key) => credentials.remove(key),
  },
  files: {
    readText: async (path: string) => {
      const content = await fetch(path);
      if (!content.ok) throw new Error(`Unable to read ${path}`);
      return content.text();
    },
    writeText: async (_path: string, _value: string) => {
      throw new Error('writeText is unavailable on the web platform');
    },
    pickOpen: async () => undefined,
    pickSave: async () => undefined,
  },
  clipboard: {
    readText: async () => {
      if (navigator.clipboard?.readText) return navigator.clipboard.readText();
      return '';
    },
    writeText: async (value: string) => {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    },
  },
  http: {
    request: (input, init) => fetch(input, init),
  },
  notifications: {
    requestPermission: async () => {
      if (typeof Notification === 'undefined') return false;
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    },
    notify: (title, body) => {
      new Notification(title, { body });
      return Promise.resolve();
    },
  },
  shell: {
    openExternal: (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
      return Promise.resolve();
    },
  },
  desktop: {
    setBadge: async () => undefined,
    setTrayTitle: async () => undefined,
    registerShortcut: async () => () => undefined,
    setAutostart: async () => undefined,
  },
  backup: {
    exportEncrypted: async () => {
      throw new Error('exportEncrypted is unavailable on the web platform');
    },
    importEncrypted: async () => {
      throw new Error('importEncrypted is unavailable on the web platform');
    },
  },
});
