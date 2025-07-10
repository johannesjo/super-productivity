// Helper functions for file operations using Node.js via PluginAPI

export const readFileContent = async (filePath: string): Promise<string> => {
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
};
