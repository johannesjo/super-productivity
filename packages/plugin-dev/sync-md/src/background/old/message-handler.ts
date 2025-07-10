/**
 * Handles messages between UI and background
 */

import { SyncConfig } from '../shared/types';

import { LOG_PREFIX } from './config.const';
import { MessageCallbacks } from './models/message.model';
import { readFileContent } from './helper/node-file-helper';

export const setupMessageHandler = (callbacks: MessageCallbacks): void => {
  if (!PluginAPI.onMessage) {
    console.error(`${LOG_PREFIX.PLUGIN} No onMessage API`);
    return;
  }

  PluginAPI.onMessage(async (message: unknown) => {
    console.log('Message received:', message);

    try {
      if (typeof message !== 'object' || message === null || !('type' in message)) {
        return { success: false, error: 'Invalid message' };
      }

      const msg = message as { type: string; config?: SyncConfig; filePath?: string };

      switch (msg.type) {
        case 'configUpdated':
          if (msg.config) {
            await callbacks.onConfigUpdated(msg.config);
          }
          return { success: true };

        case 'syncNow':
          await callbacks.onSyncNow();
          return { success: true };

        case 'testFile':
          return await handleTestFile(msg.filePath);

        // TODO can be called from ui directly
        case 'getProjects':
          return await handleGetProjects();

        // TODO can be called from ui directly
        case 'getTasks':
          return await handleGetTasks();

        case 'checkDesktopMode':
          return handleCheckDesktopMode();

        default:
          return { success: false, error: `Unknown type: ${msg.type}` };
      }
    } catch (error) {
      console.error('Message error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
};

export const handleTestFile = async (
  filePath: string,
): Promise<{ success: boolean; preview?: string; error?: string }> => {
  if (!filePath) {
    return { success: false, error: 'No file path provided' };
  }

  try {
    // Test file access
    const content = await readFileContent(filePath);
    const lines = content.split('\n').slice(0, 10);
    return {
      success: true,
      preview: lines.join('\n') + (content.split('\n').length > 10 ? '\n...' : ''),
    };
  } catch (error) {
    return { success: false, error: (error as any)?.message };
  }
};

export const handleGetProjects = async (): Promise<{
  success: boolean;
  projects: any[];
}> => {
  // Always get fresh data
  const projects = await PluginAPI.getAllProjects();
  return { success: true, projects };
};

export const handleGetTasks = async (): Promise<{ success: boolean; tasks: any[] }> => {
  // Always get fresh data
  const tasks = await PluginAPI.getTasks();
  return { success: true, tasks };
};

export const handleCheckDesktopMode = (): { success: boolean; isDesktop: boolean } => {
  // Check if we're in Electron environment with Node.js capabilities
  return {
    success: true,
    isDesktop: typeof PluginAPI?.executeNodeScript === 'function',
  };
};
