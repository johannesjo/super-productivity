import { initSyncManager } from './sync/sync-manager';
import { initUiBridge } from './ui-bridge';
import { loadLocalConfig } from './local-config';

export const initPlugin = (): void => {
  console.log('[sync-md] initPlugin called');

  // Initialize UI bridge to handle messages
  initUiBridge();
  console.log('[sync-md] UI bridge initialized');

  // Load saved config from local storage and start sync if enabled
  const config = loadLocalConfig();
  console.log('[sync-md] Loaded config:', config);

  if (config?.filePath) {
    // Transform config to match sync-manager expectations
    initSyncManager(config);
  }
};
