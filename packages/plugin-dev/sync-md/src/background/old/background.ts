/**
 * Sync-MD Plugin Background Script
 * Initializes and coordinates all plugin components
 */

import { SyncConfig } from '../shared/types';
import { SimpleFileWatcher } from './simple-file-watcher';
import { SyncManager } from './sync-manager';
import { setupMessageHandler } from './message-handler';
import { IGNORED_TASK_ACTIONS, LOG_PREFIX, REGISTERED_HOOKS } from './config.const';
import { PluginHooks } from '@super-productivity/plugin-api';

// Global instances
let fileWatcher: SimpleFileWatcher | null = null;
const syncManager = new SyncManager();

/**
 * Initialize the sync-md plugin
 */
const initPlugin = async (): Promise<void> => {
  console.log(`${LOG_PREFIX.PLUGIN} Initializing...`);

  if (typeof PluginAPI === 'undefined') {
    console.error(`${LOG_PREFIX.PLUGIN} PluginAPI not available`);
    return;
  }

  // Setup window focus tracking
  setupWindowFocusTracking();

  // Setup message handling
  setupMessageHandler({
    onConfigUpdated: handleConfigUpdate,
    onSyncNow: () => syncManager.requestSync('Manual sync'),
  });

  // Setup hooks
  setupHooks();

  // Load saved config
  await loadSavedConfig();

  console.log(`${LOG_PREFIX.PLUGIN} Initialization complete`);
};

/**
 * Setup window focus tracking
 */
const setupWindowFocusTracking = (): void => {
  if (!PluginAPI.onWindowFocusChange) return;

  PluginAPI.onWindowFocusChange((isFocused: boolean) => {
    syncManager?.setWindowFocused(isFocused);
    console.log(
      `${LOG_PREFIX.SYNC} Window focus: ${isFocused ? 'focused' : 'unfocused'}`,
    );

    if (!isFocused && syncManager) {
      syncManager.requestSync('Window focus lost');
    }
  });
};

/**
 * Setup hooks for task updates
 */
const setupHooks = (): void => {
  if (!PluginAPI.registerHook) {
    console.warn(`${LOG_PREFIX.PLUGIN} No registerHook API`);
    return;
  }

  // Register anyTaskUpdate hook
  PluginAPI.registerHook(PluginHooks.ANY_TASK_UPDATE, async (payload) => {
    const typedPayload = payload as { action?: string };
    console.log(`${LOG_PREFIX.HOOK} Task update: ${typedPayload.action}`);

    // Filter ignored actions
    const shouldIgnore = IGNORED_TASK_ACTIONS.some((ignored) =>
      typedPayload.action?.includes(ignored),
    );
    if (shouldIgnore) {
      console.log(`${LOG_PREFIX.HOOK} Ignoring: ${typedPayload.action}`);
      return;
    }

    syncManager?.requestSync(`Task update: ${typedPayload.action}`);
  });

  // Register other hooks
  const otherHooks = REGISTERED_HOOKS.filter((h) => h !== 'anyTaskUpdate');
  for (const hookName of otherHooks) {
    try {
      PluginAPI.registerHook(PluginHooks.PROJECT_LIST_UPDATE, async (payload) => {
        const typedPayload = payload as { action?: string };
        console.log(
          `${LOG_PREFIX.HOOK} ${hookName}: ${typedPayload.action || 'unknown'}`,
        );
        syncManager?.requestSync(`${hookName}: ${typedPayload.action || 'unknown'}`);
      });
    } catch (e) {
      // Hook might not exist
    }
  }
};

/**
 * Handle configuration updates
 */
const handleConfigUpdate = async (config: SyncConfig): Promise<void> => {
  console.log(`${LOG_PREFIX.BACKGROUND} Config updated:`, config);

  // Stop existing watcher
  if (fileWatcher) {
    fileWatcher.stop();
    fileWatcher = null;
  }

  if (!config.enabled) {
    return;
  }
  if (!syncManager) {
    return;
  }

  fileWatcher = new SimpleFileWatcher({
    filePath: config.filePath,
    onFileChange: (modifiedTime) => syncManager.handleFileChange(modifiedTime),
    onError: (error) => {
      console.error(`${LOG_PREFIX.FILE_WATCHER} Error:`, error);
      PluginAPI.showSnack({
        msg: `File watch error: ${error.message}`,
        type: 'ERROR',
      });
    },
  });

  await fileWatcher.start();
  await syncManager.requestSync('Initial configuration');
};

/**
 * Load saved configuration
 */
const loadSavedConfig = async (): Promise<void> => {
  const savedData = await PluginAPI.loadSyncedData?.();
  if (!savedData) return;

  try {
    const config: SyncConfig = JSON.parse(savedData);
    if (config.enabled && typeof PluginAPI.executeNodeScript === 'function') {
      await handleConfigUpdate(config);
    }
  } catch (error) {
    console.error('Failed to load saved config:', error);
  }
};

// Start plugin
if (typeof PluginAPI !== 'undefined') {
  console.log(`${LOG_PREFIX.PLUGIN} PluginAPI detected`);
  Promise.resolve().then(() => initPlugin());
} else {
  console.warn(`${LOG_PREFIX.PLUGIN} PluginAPI not found`);
}

export { initPlugin };
