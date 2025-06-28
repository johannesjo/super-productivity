import { FileWatcher } from './fileWatcher';
import { SyncConfig } from './types';

let fileWatcher: FileWatcher | null = null;

// Function to register message handler
function registerMessageHandler() {
  if (window.PluginAPI?.onMessage) {
    console.log('Registering message handler');
    window.PluginAPI.onMessage(async (message: any) => {
      console.log('Background received message:', message);

      try {
        let response: any = { success: true };

        switch (message.type) {
          case 'configUpdated':
            if (fileWatcher) {
              fileWatcher.stop();
              fileWatcher = null;
            }

            if (message.config?.enabled) {
              fileWatcher = new FileWatcher({
                config: message.config,
                onSync: (result) => {
                  console.log('Sync completed:', result);
                  // Send sync result to UI if needed
                  window.parent.postMessage(
                    {
                      type: 'SYNC_COMPLETED',
                      result,
                    },
                    '*',
                  );
                },
                onError: (error) => {
                  console.error('Sync error:', error);
                  window.parent.postMessage(
                    {
                      type: 'SYNC_ERROR',
                      error: error.message,
                    },
                    '*',
                  );
                },
              });
              await fileWatcher.start();
            }
            break;

          case 'testFile':
            const { filePath } = message;
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
                response = { success: false, error: error.message };
              }
            }
            break;

          case 'syncNow':
            if (fileWatcher) {
              // Trigger immediate sync
              await fileWatcher['performSync'](); // Access private method
              response = { success: true };
            } else {
              response = { success: false, error: 'File watcher not initialized' };
            }
            break;

          case 'getSyncInfo':
            if (fileWatcher) {
              const info = await fileWatcher.getSyncInfo();
              response = { ...info, success: true };
            } else {
              response = {
                success: true,
                lastSyncTime: 0,
                taskCount: 0,
                isWatching: false,
              };
            }
            break;

          case 'checkDesktopMode':
            // Check if we're in Electron environment
            response = {
              success: true,
              isDesktop:
                typeof window !== 'undefined' &&
                window.PluginAPI?.executeNodeScript !== undefined,
            };
            break;

          default:
            response = { success: false, error: `Unknown message type: ${message.type}` };
        }

        return response;
      } catch (error) {
        console.error('Error handling message:', error);
        return { success: false, error: error.message };
      }
    });
    return true;
  }
  return false;
}

async function readFileContent(filePath: string): Promise<string> {
  if (!window.PluginAPI?.executeNodeScript) {
    throw new Error('Node script execution not available');
  }

  const result = await window.PluginAPI.executeNodeScript({
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

// Initialize on load
window.addEventListener('load', async () => {
  console.log('Sync-MD background script loaded');

  // Try to register message handler with retries
  let registered = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!registered && attempts < maxAttempts) {
    registered = registerMessageHandler();
    if (!registered) {
      console.log(`Waiting for PluginAPI... attempt ${attempts + 1}/${maxAttempts}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    attempts++;
  }

  if (!registered) {
    console.error('Failed to register message handler after', maxAttempts, 'attempts');
  }

  // Register hook for task updates to trigger immediate sync
  if (window.PluginAPI?.registerHook) {
    console.log('Registering task update hooks for immediate sync');

    // Trigger sync when tasks are updated
    window.PluginAPI.registerHook('taskUpdate', async () => {
      if (fileWatcher) {
        console.log('Task updated - triggering immediate sync');
        await fileWatcher['performSync']();
      }
    });

    // Trigger sync when tasks are completed
    window.PluginAPI.registerHook('taskComplete', async () => {
      if (fileWatcher) {
        console.log('Task completed - triggering immediate sync');
        await fileWatcher['performSync']();
      }
    });

    // Trigger sync when tasks are deleted
    window.PluginAPI.registerHook('taskDelete', async () => {
      if (fileWatcher) {
        console.log('Task deleted - triggering immediate sync');
        await fileWatcher['performSync']();
      }
    });

    // Listen for actions that might indicate task reordering
    window.PluginAPI.registerHook('action', async (action: any) => {
      if (fileWatcher) {
        // Check if this is a project update that might contain taskIds changes
        if (
          action?.type === '[Project] Update Project' ||
          action?.type === 'UpdateProject'
        ) {
          if (
            action?.payload?.changes?.taskIds ||
            action?.payload?.project?.changes?.taskIds
          ) {
            await fileWatcher['performSync']();
          }
        }
        // Check for task updates that might contain subTaskIds changes
        else if (action?.type === '[Task] Update Task') {
          if (action?.payload?.task?.changes?.subTaskIds) {
            await fileWatcher['performSync']();
          }
        }
        // Check for today list reordering actions
        else if (
          action?.type &&
          (action.type.includes('Move Task') ||
            action.type.includes('move Task') ||
            action.type.includes('Move task') ||
            action.type === '[WorkContext] Move Task In Today List' ||
            action.type.includes('Reorder') ||
            action.type.includes('reorder'))
        ) {
          await fileWatcher['performSync']();
        }
      }
    });
  }

  // Check if we have saved config
  const savedData = await window.PluginAPI?.loadSyncedData?.();
  if (savedData) {
    try {
      const config: SyncConfig = JSON.parse(savedData);
      if (config.enabled) {
        fileWatcher = new FileWatcher({
          config,
          onSync: (result) => {
            console.log('Auto-sync completed:', result);
          },
          onError: (error) => {
            console.error('Auto-sync error:', error);
          },
        });
        await fileWatcher.start();
      }
    } catch (error) {
      console.error('Failed to load saved config:', error);
    }
  }
});

// Extend window interface
declare global {
  interface Window {
    PluginAPI: any;
  }
}
