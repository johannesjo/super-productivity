import { startFileWatcher, stopFileWatcher } from './file-watcher';
import { spToMd } from './sp-to-md';
import { mdToSp } from './md-to-sp';
import { getFileStats, readTasksFile } from '../helper/file-utils';
import {
  SYNC_DEBOUNCE_MS,
  SYNC_DEBOUNCE_MS_UNFOCUSED,
  SYNC_DEBOUNCE_MS_MD_TO_SP,
} from '../config.const';
import { PluginHooks } from '@super-productivity/plugin-api';
import { LocalUserCfg } from '../local-config';
import { logSyncVerification, verifySyncState } from './verify-sync';

let syncInProgress = false;
let lastSyncTime: Date | null = null;
let mdToSpDebounceTimer: NodeJS.Timeout | null = null;
let spToMdDebounceTimer: NodeJS.Timeout | null = null;
let isWindowFocused = true;
let pendingMdToSpSync: LocalUserCfg | null = null;

export const initSyncManager = (config: LocalUserCfg): void => {
  // Stop any existing file watcher
  stopFileWatcher();

  // Set up window focus tracking
  setupWindowFocusTracking();

  // Perform initial sync
  performInitialSync(config).then((r) => console.log('SyncMD initial sync', r));

  // Set up file watcher for ongoing sync
  startFileWatcher(config.filePath, () => {
    handleFileChange(config);
  });

  // Set up hooks for SP changes
  setupSpHooks(config);
};

const performInitialSync = async (config: LocalUserCfg): Promise<void> => {
  if (syncInProgress) return;
  syncInProgress = true;

  try {
    const fileStats = await getFileStats(config.filePath);
    const lastSpChange = getLastSpChangeTime();

    // Determine sync direction
    if (!fileStats) {
      // No file exists, create from SP
      await spToMd(config);
    } else if (!lastSpChange || fileStats.mtime > lastSpChange) {
      // File is newer, sync to SP
      const content = await readTasksFile(config.filePath);
      if (content) {
        // Use the project ID from config, fallback to default
        const projectId = config.projectId;
        await mdToSp(content, projectId);
      }
    } else {
      // SP is newer, sync to file
      await spToMd(config);
    }

    lastSyncTime = new Date();

    // Verify sync state after initial sync
    const verificationResult = await verifySyncState(config);
    logSyncVerification(verificationResult, 'initial sync');
  } finally {
    syncInProgress = false;
  }
};

const handleFileChange = (config: LocalUserCfg): void => {
  if (mdToSpDebounceTimer) {
    clearTimeout(mdToSpDebounceTimer);
  }

  // Mark that we have a pending MD to SP sync
  pendingMdToSpSync = config;

  // Always use 10 second debounce for MD to SP sync
  console.log(
    `[sync-md] File change detected, debouncing for ${SYNC_DEBOUNCE_MS_MD_TO_SP}ms (10 seconds)`,
  );

  mdToSpDebounceTimer = setTimeout(() => {
    handleMdToSpSync(config);
  }, SYNC_DEBOUNCE_MS_MD_TO_SP);
};

const handleMdToSpSync = async (config: LocalUserCfg): Promise<void> => {
  if (syncInProgress) return;
  syncInProgress = true;
  pendingMdToSpSync = null;
  mdToSpDebounceTimer = null;

  try {
    const content = await readTasksFile(config.filePath);
    if (content) {
      // Use the project ID from config, fallback to default
      const projectId = config.projectId;
      await mdToSp(content, projectId);
      lastSyncTime = new Date();

      // Verify sync state after file change sync
      const verificationResult = await verifySyncState(config);
      logSyncVerification(verificationResult, 'MD to SP sync (file change)');

      // If there are still differences after MD→SP sync, trigger SP→MD sync to resolve them
      if (!verificationResult.isInSync) {
        console.log(
          '[sync-md] MD to SP sync incomplete, triggering SP to MD sync to resolve remaining differences',
        );

        // Temporarily disable file watcher to prevent triggering another MD→SP sync
        stopFileWatcher();

        try {
          await spToMd(config);

          // Verify again after SP→MD sync
          const finalVerification = await verifySyncState(config);
          logSyncVerification(finalVerification, 'SP to MD sync (resolving differences)');
        } finally {
          // Re-enable file watcher
          startFileWatcher(config.filePath, () => {
            handleFileChange(config);
          });
        }
      }
    }
  } finally {
    syncInProgress = false;
  }
};

const setupSpHooks = (config: LocalUserCfg): void => {
  // Listen for task changes
  PluginAPI.registerHook(PluginHooks.ANY_TASK_UPDATE, () => {
    handleSpChange(config);
  });
  PluginAPI.registerHook(PluginHooks.PROJECT_LIST_UPDATE, () => {
    handleSpChange(config);
  });
};

const handleSpChange = (config: LocalUserCfg): void => {
  if (spToMdDebounceTimer) {
    clearTimeout(spToMdDebounceTimer);
  }

  console.log(
    `[sync-md] SP change detected, debouncing for ${SYNC_DEBOUNCE_MS}ms (0.5 seconds)`,
  );

  // For SP changes, we always use the short debounce since the user is actively using SP
  spToMdDebounceTimer = setTimeout(async () => {
    if (syncInProgress) return;
    syncInProgress = true;

    try {
      await spToMd(config);
      lastSyncTime = new Date();

      // Verify sync state after SP change sync
      const verificationResult = await verifySyncState(config);
      logSyncVerification(verificationResult, 'SP to MD sync (SP change)');
    } finally {
      syncInProgress = false;
    }
  }, SYNC_DEBOUNCE_MS);
};

const getLastSpChangeTime = (): Date | null => {
  // This is a simplified version - in reality, you'd track the actual last change
  return lastSyncTime;
};

const setupWindowFocusTracking = (): void => {
  // Check if the API is available
  if (!PluginAPI.onWindowFocusChange) {
    console.log('[sync-md] Window focus tracking not available');
    return;
  }

  PluginAPI.onWindowFocusChange((isFocused: boolean) => {
    const wasFocused = isWindowFocused;
    isWindowFocused = isFocused;
    console.log(`[sync-md] Window focus changed: ${isFocused ? 'focused' : 'unfocused'}`);

    // If window gains focus and we have a pending MD to SP sync, trigger it immediately
    if (isFocused && !wasFocused && pendingMdToSpSync && mdToSpDebounceTimer) {
      console.log(
        '[sync-md] Window gained focus, triggering pending MD to SP sync immediately',
      );
      clearTimeout(mdToSpDebounceTimer);
      mdToSpDebounceTimer = null;

      // Trigger the sync immediately
      handleMdToSpSync(pendingMdToSpSync);
    }
  });
};
