// Type declarations for Super Productivity Plugin API

import { PluginAPI } from '@super-productivity/plugin-api';

declare global {
  const PluginAPI: PluginAPI;

  interface Window {
    PluginAPI: PluginAPI;
    initPlugin?: () => void | Promise<void>;
    // @ts-ignore
    parent: Window;
  }
}
