// File operations abstraction - makes testing easier by allowing mocking
export interface FileOperations {
  readFile(filePath: string): Promise<string>;

  writeFile(filePath: string, content: string): Promise<void>;

  watchFile(filePath: string, callback: () => void): Promise<() => void>;
}

export interface NodeScriptResult {
  success: boolean;
  result?: any;
  error?: string;
}

export interface NodeScriptOptions {
  script: string;
  args: any[];
  timeout: number;
}

export interface PluginAPILike {
  executeNodeScript(options: NodeScriptOptions): Promise<NodeScriptResult>;
}

/**
 * Production file operations using PluginAPI
 */
export class PluginFileOperations implements FileOperations {
  constructor(private pluginAPI: PluginAPILike) {}

  async readFile(filePath: string): Promise<string> {
    // Check if we're in desktop mode
    if (typeof this.pluginAPI?.executeNodeScript !== 'function') {
      throw new Error(
        'File operations are only available in the desktop version of Super Productivity',
      );
    }

    const result = await this.pluginAPI.executeNodeScript({
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

    if (!result.success || !result.result?.success) {
      throw new Error(result.error || result.result?.error || 'Failed to read file');
    }

    return result.result.content;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    // Check if we're in desktop mode
    if (typeof this.pluginAPI?.executeNodeScript !== 'function') {
      throw new Error(
        'File operations are only available in the desktop version of Super Productivity',
      );
    }

    const result = await this.pluginAPI.executeNodeScript({
      script: `
        const fs = require('fs');
        const path = require('path');

        try {
          const absolutePath = path.resolve(args[0]);
          fs.writeFileSync(absolutePath, args[1], 'utf8');
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      `,
      args: [filePath, content],
      timeout: 5000,
    });

    if (!result.success || !result.result?.success) {
      throw new Error(result.error || result.result?.error || 'Failed to write file');
    }
  }

  async watchFile(filePath: string, callback: () => void): Promise<() => void> {
    // Check if we're in desktop mode
    if (typeof this.pluginAPI?.executeNodeScript !== 'function') {
      throw new Error(
        'File operations are only available in the desktop version of Super Productivity',
      );
    }

    // Note: This method is currently not used. The FileWatcherBatch class
    // implements its own polling mechanism for file watching.
    // We'll implement a simple polling approach here if needed in the future.

    let interval: NodeJS.Timer | null = null;
    let lastModTime = 0;

    // Start polling
    interval = setInterval(async () => {
      try {
        const result = await this.pluginAPI.executeNodeScript({
          script: `
            const fs = require('fs');
            const path = require('path');

            try {
              const absolutePath = path.resolve(args[0]);

              if (!fs.existsSync(absolutePath)) {
                return { success: false, error: 'File not found' };
              }

              const stats = fs.statSync(absolutePath);
              return {
                success: true,
                mtime: stats.mtime.getTime()
              };
            } catch (error) {
              return { success: false, error: error.message };
            }
          `,
          args: [filePath],
          timeout: 2000,
        });

        if (result.success && result.result?.success) {
          const currentModTime = result.result.mtime;

          // Check if file was modified
          if (lastModTime > 0 && currentModTime > lastModTime) {
            callback();
          }

          lastModTime = currentModTime;
        }
      } catch (error) {
        console.warn('Error checking file modification:', error);
      }
    }, 2000); // Check every 2 seconds

    // Return cleanup function
    return async () => {
      if (interval) {
        clearInterval(interval as any);
        interval = null;
      }
    };
  }
}

/**
 * Mock file operations for testing
 */
export class MockFileOperations implements FileOperations {
  private files = new Map<string, string>();
  private watchers = new Map<string, () => void>();

  setFileContent(filePath: string, content: string): void {
    this.files.set(filePath, content);
  }

  getFileContent(filePath: string): string | undefined {
    return this.files.get(filePath);
  }

  triggerFileChange(filePath: string): void {
    const callback = this.watchers.get(filePath);
    if (callback) {
      callback();
    }
  }

  async readFile(filePath: string): Promise<string> {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error('File not found');
    }
    return content;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    this.files.set(filePath, content);
  }

  async watchFile(filePath: string, callback: () => void): Promise<() => void> {
    this.watchers.set(filePath, callback);
    return () => {
      this.watchers.delete(filePath);
    };
  }

  clearAll(): void {
    this.files.clear();
    this.watchers.clear();
  }
}
