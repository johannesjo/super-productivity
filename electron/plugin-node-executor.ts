import { BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vm from 'vm';
import { v4 as uuidv4 } from 'uuid';
import { IPC } from './shared-with-frontend/ipc-events.const';
import {
  PluginNodeScriptRequest,
  PluginNodeScriptResult,
  PluginManifest,
} from '../packages/plugin-api/dist/types';

interface PluginNodeExecutionContext {
  pluginId: string;
  manifest: PluginManifest;
  userDataPath: string;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_MEMORY_LIMIT = '128MB';
const MAX_TIMEOUT = 300000; // 5 minutes

class PluginNodeExecutor {
  private executionContexts: Map<string, PluginNodeExecutionContext> = new Map();

  constructor() {
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    ipcMain.handle(
      IPC.PLUGIN_EXEC_NODE_SCRIPT,
      async (event, pluginId: string, request: PluginNodeScriptRequest) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
          throw new Error('No window found for event sender');
        }

        const context = this.executionContexts.get(pluginId);
        if (!context) {
          throw new Error(`No execution context found for plugin: ${pluginId}`);
        }

        return await this.executeScript(context, request);
      },
    );

    ipcMain.on(
      IPC.PLUGIN_REGISTER_FOR_NODE,
      (event, pluginId: string, manifest: PluginManifest, userDataPath: string) => {
        this.registerPlugin(pluginId, manifest, userDataPath);
      },
    );

    ipcMain.on(IPC.PLUGIN_UNREGISTER_FOR_NODE, (event, pluginId: string) => {
      this.unregisterPlugin(pluginId);
    });
  }

  public registerPlugin(
    pluginId: string,
    manifest: PluginManifest,
    userDataPath: string,
  ): void {
    this.executionContexts.set(pluginId, {
      pluginId,
      manifest,
      userDataPath,
    });
  }

  public unregisterPlugin(pluginId: string): void {
    this.executionContexts.delete(pluginId);
    // Clean up plugin resources
    this.cleanup(pluginId).catch((err) =>
      console.error(`Failed to cleanup plugin ${pluginId}:`, err),
    );
  }

  private validateScriptRequest(request: PluginNodeScriptRequest): void {
    if (!request.script || typeof request.script !== 'string') {
      throw new Error('Script must be a non-empty string');
    }

    if (request.script.length > 100000) {
      throw new Error('Script too large (max 100KB)');
    }

    if (request.timeout !== undefined) {
      if (typeof request.timeout !== 'number' || request.timeout < 0) {
        throw new Error('Timeout must be a positive number');
      }
      if (request.timeout > MAX_TIMEOUT) {
        throw new Error(`Timeout exceeds maximum allowed (${MAX_TIMEOUT}ms)`);
      }
    }

    if (request.args !== undefined && !Array.isArray(request.args)) {
      throw new Error('Args must be an array');
    }
  }

  private async executeScript(
    context: PluginNodeExecutionContext,
    request: PluginNodeScriptRequest,
  ): Promise<PluginNodeScriptResult> {
    const startTime = Date.now();

    // Validate request
    try {
      this.validateScriptRequest(request);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid script request',
        executionTime: Date.now() - startTime,
      };
    }

    // For simple scripts, try to execute directly in the main process with sandboxing
    // This avoids the need for spawning node which might not be available
    if (this.canExecuteDirectly(request.script)) {
      try {
        const result = await this.executeDirectly(request.script, request.args);
        return {
          success: true,
          result,
          executionTime: Date.now() - startTime,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Script execution failed',
          executionTime: Date.now() - startTime,
        };
      }
    }

    const tempDir = path.join(os.tmpdir(), 'sup-plugin-exec', context.pluginId);
    const scriptFile = path.join(tempDir, `${uuidv4()}.js`);

    try {
      // Create temp directory
      await fs.mkdir(tempDir, { recursive: true });

      // Prepare the script with sandboxing wrapper
      const wrappedScript = this.wrapScript(request.script, request.args);
      await fs.writeFile(scriptFile, wrappedScript, 'utf8');

      // Get timeout and memory limit
      const timeout = Math.min(
        request.timeout || context.manifest.nodeScriptConfig?.timeout || DEFAULT_TIMEOUT,
        MAX_TIMEOUT,
      );
      const memoryLimit =
        context.manifest.nodeScriptConfig?.memoryLimit || DEFAULT_MEMORY_LIMIT;

      // Execute the script
      const { result, resourceUsage } = await this.runScript(
        scriptFile,
        context,
        timeout,
        memoryLimit,
      );

      return {
        success: true,
        result: result,
        executionTime: Date.now() - startTime,
        resourceUsage,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(scriptFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  private wrapScript(script: string, args?: unknown[]): string {
    // Wrap the script in a function to isolate scope and provide controlled environment
    return `
'use strict';

// Freeze prototypes to prevent pollution
Object.freeze(Object.prototype);
Object.freeze(Array.prototype);
Object.freeze(Function.prototype);

// Remove dangerous globals
const dangerousGlobals = [
  'require',
  'module',
  'exports',
  '__dirname',
  '__filename',
  'global',
  'process.exit',
  'process.kill',
  'process.env',
  'process.binding',
  'process.dlopen',
  'child_process',
  'cluster',
  'dgram',
  'dns',
  'domain',
  'net',
  'repl',
  'tls',
  'tty',
  'v8',
  'vm',
  'fs',
  'http',
  'https',
  'crypto',
  'os',
  'path',
  'url',
  'util',
  'stream',
  'events',
  'Buffer',
  'setImmediate',
  'clearImmediate',
];

for (const globalName of dangerousGlobals) {
  if (globalName.includes('.')) {
    const [obj, prop] = globalName.split('.');
    if (global[obj] && global[obj][prop]) {
      delete global[obj][prop];
    }
  } else if (global[globalName]) {
    delete global[globalName];
  }
}

// Prevent reconstruction via constructor chain
delete Function.prototype.constructor;
delete Object.prototype.constructor;

// Limited process object
const safeProcess = {
  version: process.version,
  versions: process.versions,
  platform: process.platform,
  arch: process.arch,
};

// Execute user script in isolated context
(async function() {
  const args = ${JSON.stringify(args || [])};
  const process = safeProcess;
  
  try {
    const result = await (async function() {
      ${script}
    })();
    
    console.log(JSON.stringify({ __result: result }));
  } catch (error) {
    console.error(JSON.stringify({ 
      __error: error.message || String(error),
      __stack: error.stack 
    }));
    process.exit(1);
  }
})();
`;
  }

  private async runScript(
    scriptPath: string,
    context: PluginNodeExecutionContext,
    timeout: number,
    memoryLimit: string,
  ): Promise<{ result: unknown; resourceUsage?: { peakMemoryMB: number } }> {
    return new Promise((resolve, reject) => {
      const memoryLimitMB = this.parseMemoryLimit(memoryLimit);

      // Get node executable path - try multiple options
      let nodePath = 'node';

      // Try to use Electron's node if available
      if (process.execPath && process.execPath.includes('electron')) {
        // On some systems, we can use the electron executable with node mode
        nodePath = process.execPath;
      }

      // Spawn node process with restrictions
      const child = spawn(
        nodePath,
        [
          '--no-warnings',
          `--max-old-space-size=${memoryLimitMB}`,
          '--no-expose-wasm',
          scriptPath,
        ],
        {
          cwd: context.userDataPath, // Plugin's data directory
          env: {
            // Minimal environment with PATH
            NODE_ENV: 'production',
            PLUGIN_ID: context.pluginId,
            PATH: process.env.PATH || '',
            // Include Electron's internal node path if available
            ELECTRON_RUN_AS_NODE: '1',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      let stdout = '';
      let stderr = '';
      let killed = false;
      let peakMemoryUsage = 0;

      // Handle spawn errors
      child.on('error', (err) => {
        clearTimeout(timer);
        clearInterval(memoryMonitor);
        console.error('Failed to spawn node process:', err);
        if (err.code === 'ENOENT') {
          reject(
            new Error(
              'Node.js executable not found. Please ensure Node.js is installed and in PATH.',
            ),
          );
        } else {
          reject(err);
        }
      });

      // Set timeout
      const timer = setTimeout(() => {
        killed = true;
        child.kill('SIGTERM');
        reject(new Error(`Script execution timed out after ${timeout}ms`));
      }, timeout);

      // Monitor memory usage
      const memoryMonitor = setInterval(() => {
        try {
          const usage = process.memoryUsage();
          peakMemoryUsage = Math.max(peakMemoryUsage, usage.heapUsed);
        } catch (e) {
          // Ignore monitoring errors
        }
      }, 100);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        clearInterval(memoryMonitor);

        if (killed) {
          return;
        }

        const resourceUsage = {
          peakMemoryMB: Math.round((peakMemoryUsage / 1024 / 1024) * 100) / 100,
        };

        try {
          // Parse the result
          const output = stdout.trim();
          if (output) {
            const parsed = JSON.parse(output);
            if (parsed.__error) {
              // Try to extract line number from stack trace
              const errorMatch = parsed.__stack?.match(/at.*:(\d+):(\d+)/);
              const error = new Error(parsed.__error);
              if (errorMatch) {
                (error as Error & { line?: number; column?: number }).line = parseInt(
                  errorMatch[1],
                  10,
                );
                (error as Error & { line?: number; column?: number }).column = parseInt(
                  errorMatch[2],
                  10,
                );
              }
              reject(error);
            } else if (parsed.__result !== undefined) {
              resolve({ result: parsed.__result, resourceUsage });
            } else {
              resolve({ result: undefined, resourceUsage });
            }
          } else if (code !== 0) {
            // Check for specific error types
            let errorMessage = stderr || `Process exited with code ${code}`;
            if (stderr.includes('JavaScript heap out of memory')) {
              errorMessage = 'Script exceeded memory limit';
            } else if (stderr.includes('Maximum call stack')) {
              errorMessage = 'Script exceeded maximum call stack size';
            }
            reject(new Error(errorMessage));
          } else {
            resolve({ result: undefined, resourceUsage });
          }
        } catch (e) {
          reject(new Error(`Failed to parse script output: ${e}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  private parseMemoryLimit(limit: string): number {
    const match = limit.match(/^(\d+)([KMG])B$/i);
    if (!match) {
      return 128; // Default to 128MB
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'K':
        return Math.round(value / 1024);
      case 'M':
        return value;
      case 'G':
        return value * 1024;
      default:
        return 128;
    }
  }

  private canExecuteDirectly(script: string): boolean {
    // Check if the script only uses safe fs operations
    const hasOnlyAllowedRequires = !script.match(
      /require\s*\(\s*['"`](?!fs|path)[^'"]+['"`]\s*\)/,
    );
    const hasNoDangerousPatterns = !script.match(
      /child_process|exec|spawn|eval|Function|process\.exit/,
    );

    return hasOnlyAllowedRequires && hasNoDangerousPatterns;
  }

  private async executeDirectly(script: string, args?: unknown[]): Promise<unknown> {
    // Create a sandboxed context for execution
    const fsModule = await import('fs');
    const pathModule = await import('path');

    // Create sandbox with limited APIs
    const sandbox = {
      require: (module: string) => {
        if (module === 'fs') return fsModule;
        if (module === 'path') return pathModule;
        throw new Error(`Module '${module}' is not allowed`);
      },
      console: {
        log: (output: any) => {
          // Capture console.log output as the result
          sandbox.__result = output;
        },
        error: console.error,
      },
      JSON,
      __result: undefined,
      args: args || [],
    };

    // Run the script in sandbox
    const context = vm.createContext(sandbox);
    const wrappedScript = `
      (function() {
        ${script}
      })();
    `;

    vm.runInContext(wrappedScript, context, {
      timeout: 5000, // 5 second timeout
    });

    // Return the captured result
    return sandbox.__result;
  }

  /**
   * Clean up resources for a specific plugin or all plugins
   */
  public async cleanup(pluginId?: string): Promise<void> {
    if (pluginId) {
      // Clean up specific plugin
      this.executionContexts.delete(pluginId);

      // Remove plugin's temp directory
      const tempDir = path.join(os.tmpdir(), 'sup-plugin-exec', pluginId);
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    } else {
      // Clean up all plugins
      this.executionContexts.clear();

      // Remove all temp directories
      const tempDir = path.join(os.tmpdir(), 'sup-plugin-exec');
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

export const pluginNodeExecutor = new PluginNodeExecutor();
