import { BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { IPC } from './shared-with-frontend/ipc-events.const';
import {
  PluginNodeScriptRequest,
  PluginNodeScriptResult,
} from '../packages/plugin-api/dist/types';

interface PluginNodeExecutionContext {
  pluginId: string;
  manifest: any; // PluginManifest type from plugin-api
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
      (event, pluginId: string, manifest: any, userDataPath: string) => {
        this.registerPlugin(pluginId, manifest, userDataPath);
      },
    );

    ipcMain.on(IPC.PLUGIN_UNREGISTER_FOR_NODE, (event, pluginId: string) => {
      this.unregisterPlugin(pluginId);
    });
  }

  public registerPlugin(pluginId: string, manifest: any, userDataPath: string): void {
    this.executionContexts.set(pluginId, {
      pluginId,
      manifest,
      userDataPath,
    });
  }

  public unregisterPlugin(pluginId: string): void {
    this.executionContexts.delete(pluginId);
  }

  private async executeScript(
    context: PluginNodeExecutionContext,
    request: PluginNodeScriptRequest,
  ): Promise<PluginNodeScriptResult> {
    const startTime = Date.now();
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
      const result = await this.runScript(scriptFile, context, timeout, memoryLimit);

      return {
        success: true,
        result: result,
        executionTime: Date.now() - startTime,
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

  private wrapScript(script: string, args?: any[]): string {
    // Wrap the script in a function to isolate scope and provide controlled environment
    return `
'use strict';

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
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const memoryLimitMB = this.parseMemoryLimit(memoryLimit);

      // Spawn node process with restrictions
      const child = spawn(
        'node',
        [
          '--no-warnings',
          `--max-old-space-size=${memoryLimitMB}`,
          '--no-expose-wasm',
          scriptPath,
        ],
        {
          cwd: context.userDataPath, // Plugin's data directory
          env: {
            // Minimal environment
            NODE_ENV: 'production',
            PLUGIN_ID: context.pluginId,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Set timeout
      const timer = setTimeout(() => {
        killed = true;
        child.kill('SIGTERM');
        reject(new Error(`Script execution timed out after ${timeout}ms`));
      }, timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);

        if (killed) {
          return;
        }

        try {
          // Parse the result
          const output = stdout.trim();
          if (output) {
            const parsed = JSON.parse(output);
            if (parsed.__error) {
              reject(new Error(parsed.__error));
            } else if (parsed.__result !== undefined) {
              resolve(parsed.__result);
            } else {
              resolve(undefined);
            }
          } else if (code !== 0) {
            reject(new Error(stderr || `Process exited with code ${code}`));
          } else {
            resolve(undefined);
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
}

export const pluginNodeExecutor = new PluginNodeExecutor();
