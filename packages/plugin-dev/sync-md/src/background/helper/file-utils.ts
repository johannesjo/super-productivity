interface NodeScriptResult {
  success: boolean;
  content?: string | null;
  mtime?: string | null;
  error?: string;
}

export const readTasksFile = async (filePath: string): Promise<string | null> => {
  console.log('[sync-md] readTasksFile called with filePath:', filePath);
  if (!PluginAPI.executeNodeScript) {
    throw new Error('File operations are only available in the desktop version');
  }

  const result = await PluginAPI.executeNodeScript({
    script: `
      const fs = require('fs');
      const path = require('path');

      try {
        const absolutePath = path.resolve(args[0]);
        const content = fs.readFileSync(absolutePath, 'utf8');
        return { success: true, content };
      } catch (error) {
        if (error.code === 'ENOENT') {
          return { success: true, content: null };
        }
        return { success: false, error: error.message };
      }
    `,
    args: [filePath],
    timeout: 5000,
  });

  const nodeResult = result.result as NodeScriptResult;
  if (!result.success || !nodeResult?.success) {
    throw new Error(nodeResult?.error || result.error || 'Failed to read file');
  }

  return nodeResult.content;
};

export const writeTasksFile = async (
  filePath: string,
  content: string,
): Promise<void> => {
  if (!PluginAPI.executeNodeScript) {
    throw new Error('File operations are only available in the desktop version');
  }

  const result = await PluginAPI.executeNodeScript({
    script: `
      const fs = require('fs');
      const path = require('path');

      try {
        const absolutePath = path.resolve(args[0]);
        const dirPath = path.dirname(absolutePath);

        // Ensure directory exists
        fs.mkdirSync(dirPath, { recursive: true });

        fs.writeFileSync(absolutePath, args[1], 'utf8');
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    `,
    args: [filePath, content],
    timeout: 5000,
  });

  const nodeResult = result.result as NodeScriptResult;
  if (!result.success || !nodeResult?.success) {
    throw new Error(nodeResult?.error || result.error || 'Failed to write file');
  }
};

export const getFileStats = async (filePath: string): Promise<{ mtime: Date } | null> => {
  if (!PluginAPI.executeNodeScript) {
    throw new Error('File operations are only available in the desktop version');
  }

  const result = await PluginAPI.executeNodeScript({
    script: `
      const fs = require('fs');
      const path = require('path');

      try {
        const absolutePath = path.resolve(args[0]);
        const stats = fs.statSync(absolutePath);
        return { success: true, mtime: stats.mtime.toISOString() };
      } catch (error) {
        if (error.code === 'ENOENT') {
          return { success: true, mtime: null };
        }
        return { success: false, error: error.message };
      }
    `,
    args: [filePath],
    timeout: 5000,
  });

  const nodeResult = result.result as NodeScriptResult;
  if (!result.success || !nodeResult?.success) {
    throw new Error(nodeResult?.error || result.error || 'Failed to get file stats');
  }

  return nodeResult.mtime ? { mtime: new Date(nodeResult.mtime) } : null;
};

export const ensureDirectoryExists = async (filePath: string): Promise<void> => {
  if (!PluginAPI.executeNodeScript) {
    throw new Error('File operations are only available in the desktop version');
  }

  const result = await PluginAPI.executeNodeScript({
    script: `
      const fs = require('fs');
      const path = require('path');

      try {
        const absolutePath = path.resolve(args[0]);
        const dirPath = path.dirname(absolutePath);
        fs.mkdirSync(dirPath, { recursive: true });
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    `,
    args: [filePath],
    timeout: 5000,
  });

  const nodeResult = result.result as NodeScriptResult;
  if (!result.success || !nodeResult?.success) {
    throw new Error(nodeResult?.error || result.error || 'Failed to create directory');
  }
};
