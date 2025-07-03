import { FileWatcherBatch } from './file-watcher';
import { SyncConfig } from '../shared/types';

// PluginAPI will be available in the execution context

let fileWatcher: FileWatcherBatch | null = null;
let syncDebounceTimer: any = null;

// Sync state management - single source of truth
const syncState = {
  lastSyncTime: 0,
  syncInProgress: false,
  pendingSyncReason: null as string | null,
  isWindowFocused: true, // Assume focused initially
};

const MIN_SYNC_INTERVAL = 5000; // 5 seconds minimum between syncs
const SYNC_DEBOUNCE_TIME_FOCUSED = 500; // 0.5 seconds when SP is focused
const SYNC_DEBOUNCE_TIME_UNFOCUSED = 2000; // 2 seconds when editing markdown

// Single sync entry point to prevent race conditions
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
async function requestSync(reason: string): Promise<void> {
  console.log(`[Sync] requestSync called with reason: ${reason}`);
  syncState.pendingSyncReason = reason;

  // If already syncing, don't schedule another
  if (syncState.syncInProgress) {
    console.log(`[Sync] Sync already in progress, queuing: ${reason}`);
    return;
  }

  // Clear any existing timer
  if (syncDebounceTimer) {
    console.log(`[Sync] Clearing existing sync timer`);
    const clearTimeoutFn = (globalThis as any).clearTimeout || window.clearTimeout;
    clearTimeoutFn(syncDebounceTimer);
  }

  // Schedule sync with debounce based on window focus
  const debounceTime = syncState.isWindowFocused
    ? SYNC_DEBOUNCE_TIME_FOCUSED
    : SYNC_DEBOUNCE_TIME_UNFOCUSED;

  console.log(
    `[Sync] Scheduling sync in ${debounceTime}ms (window ${syncState.isWindowFocused ? 'focused' : 'unfocused'})`,
  );

  // Use globalThis for better compatibility
  const timeoutFn = (globalThis as any).setTimeout || window.setTimeout;
  syncDebounceTimer = timeoutFn(async () => {
    console.log(`[Sync] Debounce timer fired, calling performSyncIfNeeded`);
    await performSyncIfNeeded();
  }, debounceTime) as number;
}

// Actual sync execution with rate limiting
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
async function performSyncIfNeeded(): Promise<void> {
  console.log('[Sync] performSyncIfNeeded called');
  const now = Date.now();
  const timeSinceLastSync = now - syncState.lastSyncTime;
  const reason = syncState.pendingSyncReason || 'Unknown';

  console.log(
    `[Sync] Last sync time: ${syncState.lastSyncTime}, current time: ${now}, difference: ${timeSinceLastSync}ms`,
  );

  // Check if we're within rate limit
  if (timeSinceLastSync < MIN_SYNC_INTERVAL && syncState.lastSyncTime > 0) {
    console.log(
      `[Sync] Rate limited: ${reason} - only ${timeSinceLastSync}ms since last sync (min: ${MIN_SYNC_INTERVAL}ms)`,
    );
    // Schedule retry after rate limit expires
    const retryIn = MIN_SYNC_INTERVAL - timeSinceLastSync + 1000;
    setTimeout(() => performSyncIfNeeded(), retryIn);
    return;
  }

  // Check if we can sync
  if (!fileWatcher) {
    console.log('[Sync] No file watcher available');
    return;
  }

  // Mark as syncing
  syncState.syncInProgress = true;
  syncState.lastSyncTime = now;
  syncState.pendingSyncReason = null;

  console.log(`[Sync] Starting sync: ${reason} (${timeSinceLastSync}ms since last sync)`);

  try {
    // Get fresh state from SP
    const [tasks, projects] = await Promise.all([
      PluginAPI.getTasks(),
      PluginAPI.getAllProjects(),
    ]);

    // Convert to state format
    const taskState = {
      entities: tasks.reduce((acc: any, task: any) => {
        acc[task.id] = task;
        return acc;
      }, {}),
    };

    const projectState = {
      entities: projects.reduce((acc: any, project: any) => {
        acc[project.id] = project;
        return acc;
      }, {}),
    };

    // Determine sync source based on reason
    let syncSource: 'file' | 'sp' | 'manual' = 'manual';
    if (reason.includes('File changed')) {
      syncSource = 'file';
    } else if (reason.includes('Task')) {
      syncSource = 'sp';
    }

    // Perform sync with fresh state
    await fileWatcher.performSync(taskState, projectState, syncSource);
    console.log('[Sync] Sync completed successfully');
  } catch (error) {
    console.error('[Sync] Sync error:', error);
  } finally {
    syncState.syncInProgress = false;

    // If there's a pending sync request, process it
    if (syncState.pendingSyncReason) {
      console.log(`[Sync] Processing pending sync: ${syncState.pendingSyncReason}`);
      setTimeout(() => performSyncIfNeeded(), 1000);
    }
  }
}

// Function to register message handler
const registerMessageHandler = (): boolean => {
  // PluginAPI should be available in the current scope
  if (typeof PluginAPI !== 'undefined' && PluginAPI?.onMessage) {
    console.log('Registering message handler with PluginAPI');
    PluginAPI.onMessage(async (message: any) => {
      console.log('Background received message:', message);

      try {
        let response: Record<string, unknown> = { success: true };

        // Type guard for message
        if (typeof message !== 'object' || message === null || !('type' in message)) {
          return { success: false, error: 'Invalid message format' };
        }

        const msg = message as { type: string; config?: SyncConfig; filePath?: string };

        switch (msg.type) {
          case 'configUpdated':
            console.log('[Background] Config updated:', msg.config);
            if (fileWatcher) {
              console.log('[Background] Stopping existing file watcher');
              fileWatcher.stop();
              fileWatcher = null;
            }

            if (msg.config?.enabled) {
              console.log(
                '[Background] Creating new file watcher with config:',
                msg.config,
              );
              fileWatcher = new FileWatcherBatch({
                config: msg.config,
                onSync: (result) => {
                  // Handle different sync events
                  if (result.type === 'fileChanged') {
                    console.log('[Sync] File changed, requesting sync');
                    requestSync('File changed');
                  } else {
                    console.log('[Sync] Completed:', result);
                    // Send sync result to UI
                    window.parent.postMessage(
                      {
                        type: 'SYNC_COMPLETED',
                        result,
                      },
                      '*',
                    );
                  }
                },
                onError: (error) => {
                  console.error('[Sync] Error:', error);
                  window.parent.postMessage(
                    {
                      type: 'SYNC_ERROR',
                      error: error.message,
                    },
                    '*',
                  );
                },
              });

              // Start file watcher
              console.log('[Background] Starting file watcher');
              await fileWatcher.start(true); // Skip initial sync

              // Request initial sync
              console.log('[Background] Requesting initial sync');
              await requestSync('Initial configuration');
            } else {
              console.log('[Background] Config disabled or not provided');
            }
            break;

          case 'testFile':
            const { filePath } = msg;
            if (!filePath) {
              response = { success: false, error: 'No file path provided' };
            } else {
              try {
                // Test file access
                const content = await readFileContent(filePath);
                const lines = content.split('\n').slice(0, 10);
                response = {
                  success: true,
                  preview:
                    lines.join('\n') + (content.split('\n').length > 10 ? '\n...' : ''),
                };
              } catch (error) {
                response = { success: false, error: (error as any)?.message };
              }
            }
            break;

          case 'syncNow':
            console.log('[Background] Received syncNow message');
            if (fileWatcher) {
              console.log('[Background] File watcher exists, triggering sync');
              // Force immediate sync by clearing rate limit
              syncState.lastSyncTime = 0;
              await requestSync('Manual sync');
              response = { success: true };
            } else {
              console.log('[Background] No file watcher initialized');
              response = { success: false, error: 'File watcher not initialized' };
            }
            break;

          case 'getSyncInfo':
            if (fileWatcher) {
              const info = await fileWatcher.getSyncInfo();
              response = {
                ...info,
                success: true,
                lastSyncTime: syncState.lastSyncTime,
                syncInProgress: syncState.syncInProgress,
              };
            } else {
              response = {
                success: true,
                lastSyncTime: syncState.lastSyncTime,
                taskCount: 0,
                isWatching: false,
                syncInProgress: syncState.syncInProgress,
              };
            }
            break;

          case 'getProjects':
            // Always get fresh data
            const projects = await PluginAPI.getAllProjects();
            response = { success: true, projects };
            break;

          case 'getTasks':
            // Always get fresh data
            const tasks = await PluginAPI.getTasks();
            response = { success: true, tasks };
            break;

          case 'checkDesktopMode':
            // Check if we're in Electron environment with Node.js capabilities
            response = {
              success: true,
              isDesktop: typeof PluginAPI?.executeNodeScript === 'function',
            };
            break;

          default:
            response = { success: false, error: `Unknown message type: ${msg.type}` };
        }

        return response;
      } catch (error) {
        console.error('Error handling message:', error);
        // @ts-ignore
        return { success: false, error: error.message };
      }
    });
    return true;
  }
  return false;
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
async function readFileContent(filePath: string): Promise<string> {
  if (!PluginAPI?.executeNodeScript) {
    throw new Error('Node script execution not available');
  }

  const result = await PluginAPI.executeNodeScript({
    script: `
      const fs = require('fs');
      const path = require('path');

      try {
        const absolutePath = path.resolve(args[0]);
        if (!fs.existsSync(absolutePath)) {
          return { success: false, error: 'File not found' };
        }
        const content = fs.readFileSync(absolutePath, 'utf8');
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error.message };
      }
    `,
    args: [filePath],
    timeout: 5000,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to execute node script');
  }

  if (!result.result?.success) {
    throw new Error(result.result?.error || 'Failed to read file');
  }

  return result.result.content;
}

// Plugin initialization function - will be called with PluginAPI in scope
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type,prefer-arrow/prefer-arrow-functions
async function initPlugin(): Promise<void> {
  console.log('Sync-MD plugin initializing...');

  // Check if PluginAPI exists in the current scope
  if (typeof PluginAPI === 'undefined') {
    console.error('[Plugin] PluginAPI is not available in the current scope');
    return;
  }

  // Set up window focus tracking
  if (PluginAPI.onWindowFocusChange) {
    PluginAPI.onWindowFocusChange((isFocused: boolean) => {
      syncState.isWindowFocused = isFocused;
      console.log(`[Sync] Window focus changed: ${isFocused ? 'focused' : 'unfocused'}`);
    });
  } else {
    console.warn('[Sync] Window focus tracking not available in PluginAPI');
  }

  // Check if we're in desktop mode (Electron) with Node.js capabilities
  const isDesktop = typeof PluginAPI.executeNodeScript === 'function';
  if (!isDesktop) {
    console.warn('[Plugin] Sync.md plugin requires desktop mode for file operations');
    console.warn('[Plugin] Running in limited mode - file sync features are disabled');
    console.warn('[Plugin] PluginAPI methods available:', Object.keys(PluginAPI || {}));
  } else {
    // Test executeNodeScript permission
    try {
      console.log('[Plugin] Testing executeNodeScript permission...');
      const testResult = await PluginAPI.executeNodeScript!({
        script: `return { success: true, test: 'permission granted' };`,
        args: [],
        timeout: 1000,
      });
      console.log('[Plugin] executeNodeScript permission test result:', testResult);
    } catch (error) {
      console.error('[Plugin] executeNodeScript permission test failed:', error);
      console.error(
        '[Plugin] This plugin requires Node.js execution permissions to work properly.',
      );
    }
  }

  // Register message handler immediately
  const registered = registerMessageHandler();
  if (!registered) {
    console.error('[Plugin] Failed to register message handler');
    console.error(
      '[Plugin] PluginAPI:',
      typeof PluginAPI,
      'onMessage:',
      typeof PluginAPI?.onMessage,
    );
  } else {
    console.log('[Plugin] Message handler registered successfully');
  }

  // Register hooks for task updates with better logging
  if (PluginAPI?.registerHook) {
    console.log('[Sync] Registering task update hooks');

    // Track hook call frequency for debugging
    let hookCallCount = 0;
    let lastHookCall = 0;

    // Single hook for all changes to prevent duplicate syncs
    PluginAPI.registerHook('anyTaskUpdate', (payload: any) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastHookCall;
      hookCallCount++;

      // Log hook frequency for debugging
      if (hookCallCount % 10 === 0) {
        console.log(
          `[Hook] Task update hook called ${hookCallCount} times, avg interval: ${timeSinceLastCall}ms`,
        );
      }

      lastHookCall = now;

      // Request sync with debouncing
      console.log(`[Hook] Task update action: ${payload.action}`);
      requestSync(`Task ${payload.action}`);
    });
  }

  // Check if we have saved config
  const savedData = await PluginAPI?.loadSyncedData?.();
  if (savedData) {
    try {
      const config: SyncConfig = JSON.parse(savedData);
      if (config.enabled) {
        // Only create file watcher if we have Node.js capabilities
        if (typeof PluginAPI?.executeNodeScript === 'function') {
          fileWatcher = new FileWatcherBatch({
            config,
            onSync: (result) => {
              // Handle different sync events
              if (result.type === 'fileChanged') {
                console.log('[Sync] File changed, requesting sync');
                requestSync('File changed');
              } else {
                console.log('[Sync] Auto-sync completed:', result);
              }
            },
            onError: (error) => {
              console.error('[Sync] Auto-sync error:', error);
            },
          });

          console.log('[Sync] Starting file watcher from saved config');
          await fileWatcher!.start(true); // Skip initial sync

          // Request initial sync
          await requestSync('Startup sync');
        } else {
          console.warn(
            '[Sync] Cannot start file watcher - Node.js execution not available',
          );
          console.warn(
            '[Sync] Plugin may need to request permissions or run in desktop mode',
          );
        }
      }
    } catch (error) {
      console.error('Failed to load saved config:', error);
    }
  }
}

// The plugin runner will execute this code with PluginAPI in scope
// We need to ensure initPlugin is called
console.log('[Plugin] Sync-MD plugin code loaded');

// Check if we're in the plugin execution context
if (typeof PluginAPI !== 'undefined') {
  console.log('[Plugin] PluginAPI is available, initializing plugin...');
  initPlugin().catch((error) => {
    console.error('[Plugin] Failed to initialize:', error);
  });
} else {
  console.error('[Plugin] PluginAPI not found in execution context');
}

// Also expose initPlugin for the module loader
if (typeof window !== 'undefined') {
  (window as any).initPlugin = initPlugin;
  // Export for the IIFE wrapper
  (window as any).SyncMdPlugin = { initPlugin };
}
export { initPlugin };
