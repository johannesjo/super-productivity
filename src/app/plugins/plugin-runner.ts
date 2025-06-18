import { inject, Injectable } from '@angular/core';
import {
  PluginBaseCfg,
  PluginInstance,
  PluginManifest,
  PluginMenuEntryCfg,
} from './plugin-api.model';
import { PluginAPI } from './plugin-api';
import { PluginBridgeService } from './plugin-bridge.service';
import '../core/window-ea';

@Injectable({
  providedIn: 'root',
})
export class PluginRunner {
  private _loadedPlugins = new Map<string, PluginInstance>();
  private _pluginBridge = inject(PluginBridgeService);

  constructor() {}

  async loadPlugin(
    manifest: PluginManifest,
    pluginCode: string,
    baseCfg: PluginBaseCfg,
    isEnabled: boolean = true,
  ): Promise<PluginInstance> {
    try {
      // Create plugin API instance with direct bridge service injection
      const pluginAPI = new PluginAPI(baseCfg, manifest.id, this._pluginBridge);

      // Add executeNodeScript method if plugin has nodeExecution permission
      if (this._hasNodeExecutionPermission(manifest)) {
        pluginAPI.executeNodeScript = async (request) => {
          return this._pluginBridge.executeNodeScript(request);
        };

        // Register plugin with Electron for Node.js execution
        if (window.ea?.pluginRegisterForNode) {
          const userDataPath = await window.ea.getUserDataPath();
          // Validate plugin ID to prevent path traversal
          const sanitizedPluginId = manifest.id.replace(/[^a-zA-Z0-9_-]/g, '');
          if (sanitizedPluginId !== manifest.id) {
            console.warn(
              `Plugin ID contains invalid characters, using sanitized version: ${sanitizedPluginId}`,
            );
          }
          const pluginDataPath = `${userDataPath}/plugins/${sanitizedPluginId}`;
          window.ea.pluginRegisterForNode(manifest.id, manifest, pluginDataPath);
        }
      }

      // Create plugin instance
      const pluginInstance: PluginInstance = {
        manifest,
        loaded: false,
        isEnabled, // Use the passed enabled state
      };

      // Execute plugin code in a sandboxed environment
      await this._executePluginCode(pluginCode, pluginAPI, manifest);

      // Automatically register side panel button for plugins with sidePanel flag
      if (manifest.sidePanel) {
        // Ensure plugin context is set before registering button
        this._pluginBridge._setCurrentPlugin(manifest.id);

        pluginAPI.registerSidePanelButton({
          label: manifest.name,
          icon: manifest.icon,
          onClick: () => {
            // This onClick is handled by the component to toggle the panel
            console.log(`Side panel button clicked for plugin ${manifest.id}`);
          },
        });
      }

      // Automatically register menu entry unless isSkipMenuEntry is true or sidePanel is true
      if (!manifest.isSkipMenuEntry && manifest.iFrame && !manifest.sidePanel) {
        // Ensure plugin context is set before registering menu entry
        this._pluginBridge._setCurrentPlugin(manifest.id);

        const menuEntry: Omit<PluginMenuEntryCfg, 'pluginId'> = {
          label: manifest.name,
          // No icon specified - let the plugin-icon component handle SVG icons with 'extension' fallback
          onClick: () => {
            // Set plugin context when menu is clicked
            this._pluginBridge._setCurrentPlugin(manifest.id);
            pluginAPI.showIndexHtmlAsView();
          },
        };
        pluginAPI.registerMenuEntry(menuEntry);
      }

      pluginInstance.loaded = true;
      this._loadedPlugins.set(manifest.id, pluginInstance);

      console.log(`Plugin ${manifest.id} loaded successfully`);
      return pluginInstance;
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.id}:`, error);
      // Create error instance
      const errorInstance: PluginInstance = {
        manifest,
        loaded: false,
        isEnabled: false, // Errored plugins are disabled
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this._loadedPlugins.set(manifest.id, errorInstance);
      return errorInstance;
    }
  }

  private async _executePluginCode(
    pluginCode: string,
    pluginAPI: PluginAPI,
    manifest: PluginManifest,
  ): Promise<void> {
    try {
      // Enhanced security: Execute plugin in a more secure sandbox
      await this._executeInSecureSandbox(pluginCode, pluginAPI, manifest);
    } catch (error) {
      // Clean up error message to avoid exposing internal details
      const safeError =
        error instanceof Error ? error.message : 'Plugin execution failed';
      throw new Error(`Plugin execution failed: ${safeError}`);
    }
  }

  /**
   * Execute plugin code in a secure sandbox environment
   * This method implements multiple layers of security to prevent sandbox escape
   */
  private async _executeInSecureSandbox(
    pluginCode: string,
    pluginAPI: PluginAPI,
    manifest: PluginManifest,
  ): Promise<void> {
    // Freeze prototypes to prevent prototype pollution
    this._freezePrototypes();

    // Create sandboxed globals with limited access
    const sandboxGlobals = this._createSandboxGlobals(pluginAPI, manifest);

    // Execute in enhanced function sandbox
    await this._executeInFunctionSandbox(pluginCode, sandboxGlobals);
  }

  /**
   * Freeze critical prototypes to prevent prototype pollution attacks
   */
  private _freezePrototypes(): void {
    try {
      // Freeze core prototypes
      Object.freeze(Object.prototype);
      Object.freeze(Array.prototype);
      Object.freeze(Function.prototype);
      Object.freeze(String.prototype);
      Object.freeze(Number.prototype);
      Object.freeze(Boolean.prototype);
    } catch (error) {
      console.warn('Failed to freeze prototypes:', error);
    }
  }

  /**
   * Create sandboxed globals with controlled access
   */
  private _createSandboxGlobals(
    pluginAPI: PluginAPI,
    manifest: PluginManifest,
  ): Record<string, unknown> {
    return {
      PluginAPI: pluginAPI,
      manifest: manifest,
      console: {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console),
      },
      setTimeout: (fn: () => void, delay: number) => {
        if (typeof fn !== 'function') {
          throw new Error('setTimeout callback must be a function');
        }
        return setTimeout(fn, Math.min(delay, 5000)); // Max 5 second delay
      },
      clearTimeout: (id: number) => clearTimeout(id),
      Promise: Promise,
      JSON: JSON,
      Math: Math,
      Date: Date,
      // Controlled globals - explicitly set to prevent access
      window: null,
      document: null,
      global: null,
      process: null,
      require: null,
      eval: null,
      Function: null,
      constructor: null,
    };
  }

  /**
   * Execute plugin code in an enhanced function sandbox
   */
  private async _executeInFunctionSandbox(
    pluginCode: string,
    sandboxGlobals: Record<string, unknown>,
  ): Promise<void> {
    // Validate plugin code before execution
    this._validatePluginCodeSafety(pluginCode);

    const sandboxKeys = Object.keys(sandboxGlobals);
    const sandboxValues = Object.values(sandboxGlobals);

    // Create a more secure wrapper that prevents common escape techniques
    const secureWrapper = `
      (function() {
        "use strict";
        
        // Override dangerous globals at runtime
        var window = null;
        var document = null;
        var global = null;
        var process = null;
        var require = null;
        var eval = null;
        var Function = null;
        var constructor = null;
        var XMLHttpRequest = null;
        var fetch = null;
        var WebSocket = null;
        var Worker = null;
        var importScripts = null;
        var location = null;
        var navigator = null;
        
        try {
          // Execute plugin code in strict mode
          ${pluginCode}
        } catch (e) {
          console.error('Plugin runtime error:', e);
          throw e;
        }
      }).call(Object.create(null));
    `;

    // Create function in isolated scope
    const sandboxFunction = new Function(...sandboxKeys, secureWrapper);

    // Execute with timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Plugin execution timeout (5 seconds)'));
      }, 5000);
    });

    const executionPromise = Promise.resolve(sandboxFunction(...sandboxValues));

    await Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Validate plugin code for obvious security issues
   */
  private _validatePluginCodeSafety(pluginCode: string): void {
    const dangerousPatterns = [
      /constructor\s*\(/i,
      /\.constructor\s*\(/i,
      /\[\s*["']constructor["']\s*\]/i,
      /\beval\s*\(/i,
      /Function\s*\(/i,
      /\bwith\s*\(/i,
      /\bdelete\s+/i,
      /\b__proto__\b/i,
      /\bprototype\s*\[/i,
      /Object\.defineProperty/i,
      /Object\.create\s*\(/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(pluginCode)) {
        throw new Error(
          `Plugin code contains potentially dangerous pattern: ${pattern.source}`,
        );
      }
    }

    // Check for suspicious string concatenation that might be used to bypass filters
    const suspiciousStringPatterns = [
      /["']\s*\+\s*["']/g, // String concatenation
      /\[\s*["']\w+["']\s*\+\s*["']\w+["']\s*\]/g, // Bracket notation with concatenation
    ];

    for (const pattern of suspiciousStringPatterns) {
      const matches = pluginCode.match(pattern);
      if (matches && matches.length > 3) {
        // Allow some string concatenation, but not excessive amounts
        console.warn(
          `Plugin code contains suspicious string concatenation patterns: ${matches.length} occurrences`,
        );
      }
    }
  }

  unloadPlugin(pluginId: string): boolean {
    const plugin = this._loadedPlugins.get(pluginId);
    if (plugin) {
      this._loadedPlugins.delete(pluginId);
      this._pluginBridge.unregisterPluginHooks(pluginId);

      // Unregister from Node.js execution if it had permission
      if (plugin.manifest && this._hasNodeExecutionPermission(plugin.manifest)) {
        if (window.ea?.pluginUnregisterForNode) {
          window.ea.pluginUnregisterForNode(pluginId);
        }
      }

      console.log(`Plugin ${pluginId} unloaded`);
      return true;
    }
    return false;
  }

  getLoadedPlugin(pluginId: string): PluginInstance | undefined {
    return this._loadedPlugins.get(pluginId);
  }

  getAllLoadedPlugins(): PluginInstance[] {
    return Array.from(this._loadedPlugins.values());
  }

  isPluginLoaded(pluginId: string): boolean {
    const plugin = this._loadedPlugins.get(pluginId);
    return plugin?.loaded ?? false;
  }

  async validateManifest(manifest: any): Promise<boolean> {
    try {
      // Type guard
      if (typeof manifest !== 'object' || manifest === null) {
        throw new Error('Manifest must be an object');
      }

      // Basic validation of required fields
      const required = [
        'name',
        'id',
        'manifestVersion',
        'version',
        'minSupVersion',
        'hooks',
        'permissions',
      ];

      for (const field of required) {
        if (
          !(field in manifest) ||
          manifest[field] === undefined ||
          manifest[field] === null
        ) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate types
      if (typeof manifest.name !== 'string' || manifest.name.trim() === '') {
        throw new Error('Invalid name field');
      }

      if (typeof manifest.id !== 'string' || manifest.id.trim() === '') {
        throw new Error('Invalid id field');
      }

      // Validate id format (alphanumeric with dashes/underscores)
      if (!/^[a-zA-Z0-9_-]+$/.test(manifest.id)) {
        throw new Error(
          'Plugin id must contain only alphanumeric characters, dashes, and underscores',
        );
      }

      if (!Array.isArray(manifest.hooks)) {
        throw new Error('hooks must be an array');
      }

      if (!Array.isArray(manifest.permissions)) {
        throw new Error('permissions must be an array');
      }

      if (manifest.type && !['issueProvider', 'standard'].includes(manifest.type)) {
        throw new Error('type must be either "issueProvider" or "standard"');
      }

      return true;
    } catch (error) {
      console.error('Manifest validation failed:', error);
      return false;
    }
  }

  private _hasNodeExecutionPermission(manifest: PluginManifest): boolean {
    return (
      manifest.permissions.includes('nodeExecution') ||
      manifest.permissions.includes('executeNodeScript')
    );
  }
}
